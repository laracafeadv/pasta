import { AREAS, CASO_CAMPOS, RESULTADOS_CASO, STATUS_CASO, TIPOS_CASO, pick } from '../../shared/types/crm'
import { formatarCnj, numeroCnjValido } from '../../shared/utils/juridico'
import { PROCEDIMENTOS } from '../../shared/data/checklist'

export function limparCaso(body: Record<string, any>) {
  const d = pick(body ?? {}, CASO_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') d[k] = v.trim() || null
  if ('titulo' in d && !d.titulo) throw createError({ statusCode: 400, message: 'Dê um título ao caso.' })
  if (d.tipo && !(d.tipo in TIPOS_CASO)) throw createError({ statusCode: 400, message: 'Tipo inválido.' })
  if (d.status && !(d.status in STATUS_CASO)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  if (d.resultado && !(d.resultado in RESULTADOS_CASO)) throw createError({ statusCode: 400, message: 'Resultado inválido.' })
  if (d.procedimento && !PROCEDIMENTOS.some(p => p.valor === d.procedimento)) throw createError({ statusCode: 400, message: 'Procedimento inválido.' })
  if (d.area && !(d.area in AREAS)) throw createError({ statusCode: 400, message: 'Área inválida.' })
  if (d.numero_processo) {
    if (!numeroCnjValido(d.numero_processo)) {
      throw createError({ statusCode: 400, message: 'Número de processo inválido: confira os dígitos (padrão CNJ NNNNNNN-DD.AAAA.J.TR.OOOO).' })
    }
    d.numero_processo = formatarCnj(d.numero_processo)
  }
  if ('contato_id' in d) d.contato_id = Number(d.contato_id)
  if (d.status === 'encerrado' && !d.data_encerramento) d.data_encerramento = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  return d
}
