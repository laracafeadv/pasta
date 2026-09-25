import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
import type { Escritorio, Qualificacao } from '../../shared/types/crm'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function dataExtenso(d = new Date()) {
  const [a, m, dia] = d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).split('-').map(Number)
  return `${dia} de ${MESES[m! - 1]} de ${a}`
}

/** Valor ou marcador visível para completar à mão (o documento sai mesmo com dados faltando). */
export const v = (x: string | null | undefined, rotulo: string) => (x && String(x).trim()) || `[${rotulo}]`

export function qualificacaoTexto(q: Partial<Qualificacao>, nomeFallback?: string | null) {
  const endereco = [q.endereco, q.bairro].filter(Boolean).join(', ')
  return `${v(q.nome_completo || nomeFallback, 'NOME COMPLETO')}, ${v(q.nacionalidade, 'nacionalidade')}, ${v(q.estado_civil, 'estado civil')}, `
    + `${v(q.profissao, 'profissão')}, portador(a) do RG nº ${v(q.rg, 'RG')}${q.orgao_emissor ? ` ${q.orgao_emissor}` : ''}, `
    + `inscrito(a) no CPF sob o nº ${v(q.cpf, 'CPF')}, residente e domiciliado(a) em ${v(endereco, 'endereço')}, `
    + `${v(q.cidade, 'cidade')}/${v(q.uf, 'UF')}, CEP ${v(q.cep, 'CEP')}`
}

export function advogadaTexto(e: Escritorio) {
  return `${v(e.advogada_nome, 'NOME DA ADVOGADA')}, ${v(e.advogada_qualificacao, 'nacionalidade, estado civil')}, advogada inscrita na OAB sob o nº ${v(e.oab, 'OAB')}, `
    + `com escritório profissional em ${v(e.endereco, 'endereço do escritório')}, e-mail ${v(e.email, 'e-mail')}`
}

type Bloco = { titulo?: string; texto?: string; negrito?: string; centro?: boolean; espaco?: number }

/** Monta um .docx simples, em Times New Roman 12, justificado. */
export async function gerarDocx(titulo: string, blocos: Bloco[]): Promise<Buffer> {
  const paragrafos: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: titulo, bold: true, size: 28 })] }),
  ]
  for (const b of blocos) {
    const runs: TextRun[] = []
    if (b.titulo) runs.push(new TextRun({ text: `${b.titulo} `, bold: true }))
    if (b.negrito) runs.push(new TextRun({ text: b.negrito, bold: true }))
    if (b.texto) runs.push(new TextRun({ text: b.texto }))
    paragrafos.push(new Paragraph({
      alignment: b.centro ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { after: b.espaco ?? 200, line: 360 },
      children: runs,
    }))
  }
  const doc = new Document({
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [{ properties: { page: { margin: { top: 1418, bottom: 1134, left: 1701, right: 1134 } } }, children: paragrafos }],
  })
  return Packer.toBuffer(doc)
}

export function nomeArquivo(prefixo: string, nome: string | null | undefined) {
  const base = String(nome ?? 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${prefixo}-${base || 'cliente'}.docx`
}
