import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { ehData } from '../../../../utils/secretaria'

/** "Pôr na agenda": o lembrete vira um compromisso na agenda da própria Secretária, e guarda o vínculo. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lembrete-agenda')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<{ data?: string }>(event)) ?? {}
  const client = await serverSupabaseClient(event)
  const { data: l } = await client.from('lembretes_rapidos').select('id, texto, data, hora, item_id').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!l) throw createError({ statusCode: 404, message: 'Lembrete não encontrado.' })
  if (l.item_id) throw createError({ statusCode: 409, message: 'Este lembrete já está na agenda.' })
  const dia = b.data || l.data
  if (!ehData(dia)) throw createError({ statusCode: 400, message: 'Escolha a data para pôr na agenda.' })
  const hora = l.hora ? String(l.hora).slice(0, 5) : null
  const { data: c, error } = await client.from('secretaria_itens').insert({ user_id: userId, tipo: 'compromisso', titulo: l.texto.slice(0, 200), dia, hora }).select('id').single()
  if (error) { console.error('[secretaria/agenda]', error); throw createError({ statusCode: 500, message: 'Não foi possível pôr na agenda.' }) }
  await client.from('lembretes_rapidos').update({ item_id: c.id, data: dia }).eq('id', id).eq('user_id', userId)
  return { item_id: c.id }
})
