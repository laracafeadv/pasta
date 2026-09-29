import { COMPROMISSO_CAMPOS, TIPOS_COMPROMISSO, pick } from '../../shared/types/crm'
import { calcularPrazo } from '../../shared/utils/juridico'

export function limparCompromisso(body: Record<string, any>) {
  const d = pick(body ?? {}, COMPROMISSO_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (v === '') d[k] = null
  if (d.tipo && !(d.tipo in TIPOS_COMPROMISSO)) throw createError({ statusCode: 400, message: 'Tipo inválido.' })
  if ('titulo' in d && !String(d.titulo ?? '').trim()) throw createError({ statusCode: 400, message: 'Descreva o compromisso.' })
  if (d.titulo) d.titulo = String(d.titulo).trim().slice(0, 200)
  if (d.status && !['pendente', 'concluido', 'cancelado'].includes(d.status)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  for (const k of ['contato_id', 'caso_id', 'processo_id', 'dias_prazo']) if (d[k] != null) d[k] = Number(d[k]) || null
  for (const k of ['data_limite', 'data_publicacao']) {
    if (d[k] && !/^\d{4}-\d{2}-\d{2}$/.test(d[k])) throw createError({ statusCode: 400, message: 'Data inválida.' })
  }
  if (d.inicio && Number.isNaN(new Date(d.inicio).getTime())) throw createError({ statusCode: 400, message: 'Data e hora inválidas.' })
  // Prazo: se veio publicação + dias, o vencimento é sempre calculado no servidor.
  if (d.tipo === 'prazo' && d.data_publicacao && d.dias_prazo) {
    if (d.dias_prazo < 1 || d.dias_prazo > 365) throw createError({ statusCode: 400, message: 'Quantidade de dias inválida.' })
    d.data_limite = calcularPrazo(d.data_publicacao, d.dias_prazo).vencimento
  }
  if (d.status === 'concluido') d.concluido_em = new Date().toISOString()
  if (d.status === 'pendente') d.concluido_em = null
  return d
}
