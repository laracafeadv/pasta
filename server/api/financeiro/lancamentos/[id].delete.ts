import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'financeiro/lancamentos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await serverSupabaseServiceRole(event).from('lancamentos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro interno ao excluir o lançamento.' })
  await auditar(event, 'excluiu lançamento', 'lancamento', id)
  return { success: true }
})
