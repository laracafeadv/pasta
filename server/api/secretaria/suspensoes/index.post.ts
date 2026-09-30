import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { ehData } from '../../../utils/secretaria'

/** Anota uma suspensão de expediente publicada pelo tribunal; ela passa a valer no cálculo dos prazos. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/suspensao-criar')
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  if (!ehData(b.de)) throw createError({ statusCode: 400, message: 'Informe a data inicial.' })
  const ate = b.ate || b.de
  if (!ehData(ate) || ate < b.de) throw createError({ statusCode: 400, message: 'A data final não pode ser anterior à inicial.' })
  if (Math.round((new Date(ate).getTime() - new Date(b.de).getTime()) / 864e5) > 60) throw createError({ statusCode: 400, message: 'Período longo demais (máximo 60 dias).' })
  const tribunal = ['todos', 'tjba', 'trt5', 'jf'].includes(b.tribunal) ? b.tribunal : 'todos'
  const { data, error } = await (await serverSupabaseClient(event)).from('suspensoes_expediente').insert({ de: b.de, ate, tribunal, motivo: b.motivo ? String(b.motivo).trim().slice(0, 200) : null }).select('id').single()
  if (error) { console.error('[secretaria/suspensoes]', error); throw createError({ statusCode: 500, message: 'Não foi possível anotar.' }) }
  return data
})
