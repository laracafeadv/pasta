import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { carregarFormulario } from '../../utils/formularioEstrutura'

/** Formulário completo para o construtor: seções, perguntas, condições e quantas respostas cada pergunta já tem. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/get')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return carregarFormulario(await serverSupabaseClient(event), id)
})
