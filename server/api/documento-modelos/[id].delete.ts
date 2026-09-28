import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

// Documentos já gerados com este modelo continuam intactos (o texto final já ficou gravado neles).
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documento-modelos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('documento_modelos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir o modelo.' })
  await auditar(event, 'excluiu modelo de documento', 'documento_modelo', id)
  return { success: true }
})
