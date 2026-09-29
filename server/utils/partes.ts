import { PARTE_CAMPOS, pick } from '../../shared/types/crm'

export function limparParte(body: Record<string, any>) {
  const d = pick(body ?? {}, PARTE_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') d[k] = v.trim() || null
  if ('nome' in d && !d.nome) throw createError({ statusCode: 400, message: 'Informe o nome.' })
  if ('caso_id' in d) d.caso_id = Number(d.caso_id)
  if ('contato_id' in d) d.contato_id = Number(d.contato_id) || null
  if ('papel' in d && !d.papel) d.papel = 'Interessado'
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw createError({ statusCode: 400, message: 'E-mail inválido.' })
  return d
}
