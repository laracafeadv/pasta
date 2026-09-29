import { NATUREZAS_PROCESSO, PROCESSO_CAMPOS, STATUS_DEMANDA, pick } from '../../shared/types/crm'
import { formatarCnj, numeroCnjValido } from '../../shared/utils/juridico'

export function limparProcesso(body: Record<string, any>) {
  const d = pick(body ?? {}, PROCESSO_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') d[k] = v.trim() || null
  if ('natureza' in d && !(d.natureza in NATUREZAS_PROCESSO)) throw createError({ statusCode: 400, message: 'Natureza inválida.' })
  if (d.status && !(d.status in STATUS_DEMANDA)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  if ('caso_id' in d) d.caso_id = Number(d.caso_id)
  if (d.numero && d.natureza === 'judicial') {
    if (!numeroCnjValido(d.numero)) throw createError({ statusCode: 400, message: 'Número de processo inválido: confira os dígitos (padrão CNJ NNNNNNN-DD.AAAA.J.TR.OOOO).' })
    d.numero = formatarCnj(d.numero)
  }
  if ('valor' in d) {
    d.valor = d.valor === '' || d.valor == null ? null : Number(d.valor)
    if (d.valor != null && !(d.valor >= 0 && d.valor < 1e12)) throw createError({ statusCode: 400, message: 'Valor inválido.' })
  }
  if (d.status === 'encerrado' && !d.data_encerramento) d.data_encerramento = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  if (!d.data_inicio) delete d.data_inicio
  return d
}
