import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'modelos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('modelos_mensagem').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir modelo.' })
  await auditar(event, 'excluiu modelo de mensagem', 'modelo', id)
  return { success: true }
})
