import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'pecas/modelos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await serverSupabaseServiceRole(event).from('pecas_modelos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro interno ao excluir o modelo.' })
  await auditar(event, 'excluiu modelo de peça', 'peca_modelo', id)
  return { success: true }
})
