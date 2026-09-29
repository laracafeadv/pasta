import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { excluirIntimacao } from '../../utils/intimacoes'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'intimacoes/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  await excluirIntimacao(await serverSupabaseClient(event), id)
  await auditar(event, 'excluiu intimação', 'intimacao', id)
  return { success: true }
})
