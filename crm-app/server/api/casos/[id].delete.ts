import { serverSupabaseClient } from '#supabase/server'
import { requireAdmin } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

// Excluir caso apaga os compromissos ligados a ele: só a administração pode.
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'casos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('casos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir o caso.' })
  await auditar(event, 'excluiu caso', 'caso', id)
  return { success: true }
})
