import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { excluirFormulario } from '../../utils/formularioEstrutura'
import { auditar } from '../../utils/auditoria'

// Envios e respostas antigos não são apagados (formulario_id vira null neles) e as perguntas já
// respondidas ficam arquivadas: o histórico continua na ficha ("Fora do formulário") e em Respostas.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const r = await excluirFormulario(await serverSupabaseClient(event), id)
  await auditar(event, 'excluiu formulário', 'formulario', id)
  return { success: true, ...r }
})
