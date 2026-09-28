import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparPergunta } from '../../utils/formularioPerguntas'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparPergunta(await readBody(event))
  const { data, error } = await (await serverSupabaseClient(event)).from('formulario_perguntas').update(d).eq('id', id).select().single()
  if (error) {
    console.error('[formulario-perguntas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar a pergunta.' })
  }
  await auditar(event, 'editou pergunta de formulário', 'formulario_pergunta', id)
  return data
})
