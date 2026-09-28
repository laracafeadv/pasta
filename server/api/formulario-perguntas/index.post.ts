import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparPergunta } from '../../utils/formularioPerguntas'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/create')
  const d = limparPergunta(await readBody(event))
  const { data, error } = await (await serverSupabaseClient(event)).from('formulario_perguntas').insert(d).select().single()
  if (error) {
    console.error('[formulario-perguntas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar a pergunta.' })
  }
  await auditar(event, 'criou pergunta de formulário', 'formulario_pergunta', data.id)
  return data
})
