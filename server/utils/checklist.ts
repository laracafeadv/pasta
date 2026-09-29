import { SERVICOS } from '../../shared/data/servicos'
import { FASE_MAXIMA_POR_ETAPA, ITENS_ATENDIMENTO, NOMES_FASES, PROCEDIMENTOS, type DefinicaoItem } from '../../shared/data/checklist'
import type { ChecklistEscopo, ChecklistFicha, ItemChecklist } from '../../shared/types/checklist'

export interface EntradaChecklist {
  contato: {
    etapa: string; consulta_em: string | null; pre_form_respondido_em: string | null; form_respondido_em: string | null
    drive_pasta_id: string | null; nps: number | null
  }
  honorarios: { tipo: string; status: string; created_at: string; data_contratacao: string | null }[]
  documentos: { descricao: string; obrigatorio: boolean; status: string }[]
  casos: { id: number; titulo: string; status: string; resultado: string | null; procedimento: string | null }[]
  qualificacao: { cpf: string | null; endereco: string | null } | null
  /** Última resposta da seção "Análise da consulta" nas demandas do cliente. */
  analise: { updated_at: string | null } | null
  marcas: { caso_id: number | null; chave: string; concluido_em: string; autor: { name: string | null } | null }[]
}

/** Etapas de um procedimento (vêm dos serviços do Padrão Operacional). */
export function itensDoProcedimento(procedimento: string | null | undefined): { chave: string; titulo: string; detalhe: string }[] {
  const p = PROCEDIMENTOS.find(x => x.valor === procedimento)
  if (!p) return []
  const fases = SERVICOS.find(s => s.id === p.servico)?.variantes.find(v => v.id === p.variante)?.fases ?? []
  return fases.map((f, i) => ({ chave: `${p.valor}:${i + 1}`, titulo: f.titulo.replace(/^\d+\.\s*/, ''), detalhe: f.texto }))
}

export const CHAVES_MANUAIS_ATENDIMENTO = new Set(ITENS_ATENDIMENTO.filter(i => i.tipo === 'manual').map(i => i.chave))

// Data sem hora (AAAA-MM-DD) não pode passar por fuso: senão 08/09 vira 07/09.
const dia = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso)
  ? iso.split('-').reverse().slice(0, 2).join('/')
  : new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }))
type Resultado = { feito: boolean; quando?: string | null; evidencia?: string | null }
const RECEBIDO = (s: string) => s === 'recebido' || s === 'dispensado'

/**
 * Itens automáticos: só olham fatos que já estão registrados no CRM (um honorário, um documento
 * recebido, uma resposta de formulário). Nada que dependa de julgamento é marcado sozinho.
 */
function avaliarAutomatico(chave: string, e: EntradaChecklist): Resultado {
  const { contato, honorarios, documentos, casos } = e
  const semConsulta = honorarios.filter(h => h.tipo !== 'Consulta')
  switch (chave) {
    case 'consulta_paga': {
      const h = honorarios.find(x => x.tipo === 'Consulta' && x.status === 'Pago')
      return h ? { feito: true, quando: h.data_contratacao ?? h.created_at } : { feito: false }
    }
    case 'consulta_agendada':
      return contato.consulta_em ? { feito: true, quando: contato.consulta_em } : { feito: false }
    case 'pre_form':
      return contato.pre_form_respondido_em ? { feito: true, quando: contato.pre_form_respondido_em } : { feito: false }
    case 'diagnostico':
      return e.analise?.updated_at ? { feito: true, quando: e.analise.updated_at } : { feito: false }
    case 'proposta': {
      const h = semConsulta.find(x => ['Proposta', 'Contratado', 'Pago'].includes(x.status))
      return h ? { feito: true, quando: h.created_at } : { feito: false }
    }
    case 'honorario_fechado': {
      const h = semConsulta.find(x => x.status === 'Contratado' || x.status === 'Pago')
      return h ? { feito: true, quando: h.data_contratacao ?? h.created_at } : { feito: false }
    }
    case 'dados_contrato': {
      if (contato.form_respondido_em) return { feito: true, quando: contato.form_respondido_em, evidencia: 'Formulário de dados do contrato respondido' }
      const q = e.qualificacao
      return q?.cpf && q?.endereco ? { feito: true, evidencia: 'CPF e endereço na qualificação' } : { feito: false }
    }
    case 'contrato_assinado': {
      const proc = documentos.find(d => /procuração assinada/i.test(d.descricao))
      const contr = documentos.find(d => /contrato de honorários assinado/i.test(d.descricao))
      if (!proc && !contr) return { feito: false, evidencia: 'Gere o checklist de documentos para acompanhar' }
      const ok = (d?: { status: string }) => d?.status === 'recebido'
      return { feito: ok(proc) && ok(contr), evidencia: `Procuração: ${ok(proc) ? 'recebida' : 'pendente'} · Contrato: ${ok(contr) ? 'recebido' : 'pendente'}` }
    }
    case 'pasta_drive':
      return contato.drive_pasta_id ? { feito: true } : { feito: false }
    case 'caso_aberto':
      return casos.length ? { feito: true, evidencia: casos.length === 1 ? '1 caso' : `${casos.length} casos` } : { feito: false }
    case 'docs_obrigatorios': {
      const obrig = documentos.filter(d => d.obrigatorio)
      if (!obrig.length) return { feito: false, evidencia: 'Checklist de documentos ainda não gerado' }
      const ok = obrig.filter(d => RECEBIDO(d.status)).length
      return { feito: ok === obrig.length, evidencia: `${ok} de ${obrig.length} obrigatórios` }
    }
    case 'caso_encerrado': {
      if (!casos.length) return { feito: false }
      const abertos = casos.filter(c => c.status !== 'encerrado').length
      const semResultado = casos.filter(c => c.status === 'encerrado' && !c.resultado).length
      return { feito: !abertos && !semResultado, evidencia: abertos ? `${abertos} caso(s) em aberto` : semResultado ? `${semResultado} sem resultado registrado` : null }
    }
    case 'nps':
      return contato.nps != null ? { feito: true, evidencia: `Nota ${contato.nps}` } : { feito: false }
    default:
      return { feito: false }
  }
}

export function montarChecklist(e: EntradaChecklist): ChecklistFicha {
  const marca = new Map(e.marcas.map(m => [`${m.caso_id ?? 0}|${m.chave}`, m]))
  const daMarca = (casoId: number | null, chave: string): Resultado & { quem: string | null } => {
    const m = marca.get(`${casoId ?? 0}|${chave}`)
    return m ? { feito: true, quando: m.concluido_em, quem: m.autor?.name ?? null } : { feito: false, quem: null }
  }
  const escopo = (titulo: string, casoId: number | null, itens: ItemChecklist[]): ChecklistEscopo => ({
    titulo, casoId, itens, feitos: itens.filter(i => i.concluido).length, total: itens.length,
  })

  // ── Atendimento (cliente): aparece só até a fase em que o cliente já está ─────────────────
  const faseMax = FASE_MAXIMA_POR_ETAPA[e.contato.etapa]
  let atendimento: ChecklistEscopo | null = null
  if (faseMax) {
    const relevantes = ITENS_ATENDIMENTO.filter((d: DefinicaoItem) => d.fase <= faseMax && (d.chave !== 'avaliacao_pedida' || (e.contato.nps ?? 0) >= 9))
    atendimento = escopo('Checklist do atendimento', null, relevantes.map((d) => {
      const r = d.tipo === 'auto' ? { ...avaliarAutomatico(d.chave, e), quem: null as string | null } : daMarca(null, d.chave)
      return {
        chave: d.chave, fase: NOMES_FASES[d.fase] ?? '', titulo: d.titulo, tipo: d.tipo, concluido: r.feito,
        quando: r.quando ?? null, quem: r.quem, evidencia: r.evidencia ?? null, dica: d.dica,
      }
    }))
  }

  // ── Etapas de cada caso, conforme o procedimento escolhido ───────────────────────────────
  const casos: Record<number, ChecklistEscopo> = {}
  const obrig = e.documentos.filter(d => d.obrigatorio)
  for (const c of e.casos) {
    const etapas = itensDoProcedimento(c.procedimento)
    if (!etapas.length) continue
    casos[c.id] = escopo('Etapas do procedimento', c.id, etapas.map((et) => {
      const r = daMarca(c.id, et.chave)
      const levantamento = /levantamento da documentação/i.test(et.titulo) && obrig.length
      return {
        chave: et.chave, fase: 'Etapas do procedimento', titulo: et.titulo, tipo: 'manual' as const, concluido: r.feito,
        quando: r.quando ?? null, quem: r.quem,
        evidencia: levantamento ? `Documentos: ${obrig.filter(d => RECEBIDO(d.status)).length} de ${obrig.length} obrigatórios` : null,
        dica: 'Etapa do procedimento (Padrão Operacional). Marque quando concluir.', detalhe: et.detalhe,
      }
    }))
  }
  return { atendimento, casos }
}
