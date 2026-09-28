import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos-gerados/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('documentos_gerados').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir o documento.' })
  await auditar(event, 'excluiu documento gerado', 'documento_gerado', id)
  return { success: true }
})
