import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/duplicate')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: p, error } = await client.from('formulario_perguntas').select('texto, tipo, opcoes, secao, ajuda, ordem, escopo, procedimentos, mostrar_se').eq('id', id).single()
  if (error || !p) throw createError({ statusCode: 404, message: 'Pergunta não encontrada.' })
  const { data, error: e2 } = await client.from('formulario_perguntas').insert({ ...p, texto: `${p.texto} (cópia)`.slice(0, 300), ordem: p.ordem + 1 }).select().single()
  if (e2) throw createError({ statusCode: 500, message: 'Erro ao duplicar a pergunta.' })
  await auditar(event, 'duplicou pergunta de formulário', 'formulario_pergunta', data.id)
  return data
})
