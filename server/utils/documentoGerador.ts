import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import type { SupabaseClient } from '@supabase/supabase-js'
import { valorPorExtenso } from '../../shared/utils/extenso'
import { dataExtenso } from './pecas'
import { carregarEscritorio } from './escritorio'

/** Busca no CRM os valores conhecidos (cliente, caso, honorário, escritório) pra pré-preencher as variáveis do modelo. */
export async function coletarDados(admin: SupabaseClient, o: { contatoId: number; casoId?: number | null; honorarioId?: number | null }) {
  const [{ data: contato }, { data: qual }, { data: caso }, { data: honorario }, escritorio] = await Promise.all([
    admin.from('contatos').select('nome, telefone, email').eq('id', o.contatoId).single(),
    admin.from('qualificacao').select('*').eq('contato_id', o.contatoId).maybeSingle(),
    o.casoId ? admin.from('casos').select('numero_processo, orgao, comarca').eq('id', o.casoId).maybeSingle() : Promise.resolve({ data: null }),
    o.honorarioId ? admin.from('honorarios').select('valor, descricao, forma_pagamento, parcelas').eq('id', o.honorarioId).maybeSingle() : Promise.resolve({ data: null }),
    carregarEscritorio(admin),
  ])
  const q = (qual ?? {}) as Record<string, any>
  const hoje = new Date()
  const dados: Record<string, string> = {
    nome_cliente: q.nome_completo || contato?.nome || '',
    cpf_cliente: q.cpf || '',
    rg_cliente: q.rg ? `${q.rg}${q.orgao_emissor ? ` ${q.orgao_emissor}` : ''}` : '',
    endereco_cliente: [q.endereco, q.bairro].filter(Boolean).join(', '),
    cidade_cliente: q.cidade || '',
    estado_cliente: q.uf || '',
    telefone_cliente: contato?.telefone || '',
    email_cliente: contato?.email || '',
    numero_processo: caso?.numero_processo || '',
    orgao_vara: caso?.orgao || '',
    comarca: caso?.comarca || '',
    valor: honorario?.valor ? Number(honorario.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
    valor_extenso: honorario?.valor ? valorPorExtenso(honorario.valor) : '',
    forma_pagamento: honorario?.forma_pagamento || '',
    numero_parcela: honorario?.parcelas ? String(honorario.parcelas) : '',
    referente_a: honorario?.descricao || '',
    data: hoje.toLocaleDateString('pt-BR'),
    data_extenso: dataExtenso(hoje),
    nome_advogada: escritorio.advogada_nome || '',
    oab: escritorio.oab || '',
    cidade_foro: escritorio.cidade_foro || '',
  }
  return dados
}

/** Substitui {{token}} pelos valores conhecidos; o que não tiver valor vira [TOKEN] pra completar à mão. */
export function renderConteudo(conteudo: string, dados: Record<string, string>): string {
  return conteudo.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, token) => {
    const chave = String(token).toLowerCase()
    const val = dados[chave]
    return val && val.trim() ? val : `[${chave.toUpperCase()}]`
  })
}

/**
 * Editor leve baseado em texto simples: linhas iniciadas com "# " viram título centralizado,
 * "**negrito**" vira negrito, "- item" vira lista, linha em branco separa parágrafos.
 * Não é um editor WYSIWYG completo — troca por um se um dia precisar de mais.
 */
export function textoParaDocxParagrafos(texto: string): Paragraph[] {
  const linhas = texto.split('\n')
  const paragrafos: Paragraph[] = []
  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trimEnd()
    if (!linha.trim()) { paragrafos.push(new Paragraph({ text: '' })); continue }
    if (linha.startsWith('# ')) {
      paragrafos.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: linha.slice(2), bold: true, size: 28 })] }))
      continue
    }
    const bullet = linha.startsWith('- ')
    const texto2 = bullet ? linha.slice(2) : linha
    const runs: TextRun[] = []
    const partes = texto2.split(/(\*\*[^*]+\*\*)/g)
    for (const p of partes) {
      if (p.startsWith('**') && p.endsWith('**')) runs.push(new TextRun({ text: p.slice(2, -2), bold: true }))
      else if (p) runs.push(new TextRun({ text: p }))
    }
    paragrafos.push(new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200, line: 360 },
      bullet: bullet ? { level: 0 } : undefined,
      children: runs,
    }))
  }
  return paragrafos
}

export async function gerarDocxDeTexto(titulo: string, corpo: string): Promise<Buffer> {
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [{
      properties: { page: { margin: { top: 1418, bottom: 1134, left: 1701, right: 1134 } } },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: titulo, bold: true, size: 28 })] }),
        ...textoParaDocxParagrafos(corpo),
      ],
    }],
  })
  return Packer.toBuffer(doc)
}

export const RECIBO_PADRAO = `Recebi de {{nome_cliente}}, CPF/CNPJ {{cpf_cliente}}, a importância de R$ {{valor}} ({{valor_extenso}}), referente a {{referente_a}}.

Forma de pagamento: {{forma_pagamento}}.

{{cidade_foro}}, {{data_extenso}}.


_______________________________________________
{{nome_advogada}}
Advogada
OAB/{{estado_cliente}} {{oab}}`
