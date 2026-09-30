import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lembrete-excluir')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('lembretes_rapidos').delete().eq('id', id).eq('user_id', userId)
  if (error) throw createError({ statusCode: 500, message: 'Não foi possível excluir.' })
  return { success: true }
})
