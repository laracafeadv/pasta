import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

// Envios e respostas antigos não são apagados (formulario_id vira null neles) —
// o histórico de quem respondeu o quê continua acessível em Respostas.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('formularios').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir o formulário.' })
  await auditar(event, 'excluiu formulário', 'formulario', id)
  return { success: true }
})
