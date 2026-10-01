import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { duplicarFormulario } from '../../../utils/formularioEstrutura'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/duplicar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const novo = await duplicarFormulario(await serverSupabaseClient(event), id)
  await auditar(event, 'duplicou formulário', 'formulario', novo)
  return { id: novo }
})
