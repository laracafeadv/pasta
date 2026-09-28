import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparModeloDocumento } from '../../utils/documentoModelos'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documento-modelos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody(event)
  const d = { ...limparModeloDocumento(body), ativo: body?.ativo !== false }
  const { data, error } = await (await serverSupabaseClient(event)).from('documento_modelos').update(d).eq('id', id).select().single()
  if (error) {
    console.error('[documento-modelos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar o modelo.' })
  }
  await auditar(event, 'editou modelo de documento', 'documento_modelo', id)
  return data
})
