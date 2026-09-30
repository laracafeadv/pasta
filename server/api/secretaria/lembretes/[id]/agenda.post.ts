import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { ehData } from '../../../../utils/secretaria'

/** "Pôr na agenda": o lembrete vira um compromisso (reunião/compromisso) na Agenda do CRM, e guarda o vínculo. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lembrete-agenda')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<{ data?: string }>(event)) ?? {}
  const client = await serverSupabaseClient(event)
  const { data: l } = await client.from('lembretes_rapidos').select('id, texto, data, hora, compromisso_id').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!l) throw createError({ statusCode: 404, message: 'Lembrete não encontrado.' })
  if (l.compromisso_id) throw createError({ statusCode: 409, message: 'Este lembrete já está na agenda.' })
  const dia = b.data || l.data
  if (!ehData(dia)) throw createError({ statusCode: 400, message: 'Escolha a data para pôr na agenda.' })
  const hora = l.hora ? String(l.hora).slice(0, 5) : null
  const row: Record<string, any> = { tipo: 'reuniao', titulo: l.texto.slice(0, 200), responsavel_id: userId }
  if (hora) row.inicio = `${dia}T${hora}:00-03:00`; else row.data_limite = dia
  const { data: c, error } = await client.from('compromissos').insert(row).select('id').single()
  if (error) { console.error('[secretaria/agenda]', error); throw createError({ statusCode: 500, message: 'Não foi possível pôr na agenda.' }) }
  await client.from('lembretes_rapidos').update({ compromisso_id: c.id, data: dia }).eq('id', id).eq('user_id', userId)
  return { compromisso_id: c.id }
})
