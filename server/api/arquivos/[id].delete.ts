import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'arquivos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: arq } = await client.from('arquivos').select('path').eq('id', id).maybeSingle()
  if (!arq) throw createError({ statusCode: 404, message: 'Documento não encontrado.' })
  const { error } = await client.from('arquivos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir o documento.' })
  await serverSupabaseServiceRole(event).storage.from('documentos').remove([arq.path])
  await auditar(event, 'excluiu documento', 'arquivo', id)
  return { success: true }
})
