import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

// Arquiva em vez de apagar: perguntas já usadas em formulários (ou em respostas antigas,
// que guardam o próprio texto/tipo) não podem sumir de baixo de ninguém.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/archive')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('formulario_perguntas').update({ arquivada: true }).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao arquivar a pergunta.' })
  await auditar(event, 'arquivou pergunta de formulário', 'formulario_pergunta', id)
  return { success: true }
})
