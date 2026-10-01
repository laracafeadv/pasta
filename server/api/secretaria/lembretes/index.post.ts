import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { ehData, ehHora } from '../../../utils/secretaria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lembrete-criar')
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  const texto = String(b.texto ?? '').trim().slice(0, 300)
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva o lembrete.' })
  if (b.data && !ehData(b.data)) throw createError({ statusCode: 400, message: 'Data inválida.' })
  if (b.hora && !ehHora(b.hora)) throw createError({ statusCode: 400, message: 'Hora inválida.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('lembretes_rapidos').insert({ user_id: userId, texto, data: b.data || null, hora: b.hora || null }).select('id').single()
  if (error) { console.error('[secretaria/lembretes]', error); throw createError({ statusCode: 500, message: 'Não foi possível criar o lembrete.' }) }
  return data
})
