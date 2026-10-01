import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/suspensao-excluir')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('suspensoes_expediente').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Não foi possível excluir.' })
  return { success: true }
})
