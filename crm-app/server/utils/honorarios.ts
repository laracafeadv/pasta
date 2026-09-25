import { HONORARIO_CAMPOS_EDITAVEIS, STATUS_HONORARIO, TIPOS_HONORARIO, pick } from '../../shared/types/crm'

export function limparHonorario(body: Record<string, any>) {
  const data = pick(body ?? {}, HONORARIO_CAMPOS_EDITAVEIS) as Record<string, any>
  if ('valor' in data) {
    data.valor = Number(data.valor)
    if (!Number.isFinite(data.valor) || data.valor < 0) throw createError({ statusCode: 400, message: 'Valor inválido.' })
  }
  if ('parcelas' in data) data.parcelas = Math.max(1, Math.min(120, Number.parseInt(data.parcelas, 10) || 1))
  if ('tipo' in data && !(TIPOS_HONORARIO as readonly string[]).includes(data.tipo)) throw createError({ statusCode: 400, message: 'Tipo de honorário inválido.' })
  if ('status' in data && !(STATUS_HONORARIO as readonly string[]).includes(data.status)) throw createError({ statusCode: 400, message: 'Status inválido.' })
  if ('contato_id' in data) data.contato_id = Number(data.contato_id)
  for (const [k, v] of Object.entries(data)) if (v === '') data[k] = null
  return data
}
