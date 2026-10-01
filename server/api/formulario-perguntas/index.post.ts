import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparPergunta } from '../../utils/formularioPerguntas'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/create')
  const d = limparPergunta(await readBody(event))
  const client = await serverSupabaseClient(event)
  const { data: ult } = await client.from('formulario_perguntas').select('ordem').order('ordem', { ascending: false }).limit(1)
  const { data, error } = await client.from('formulario_perguntas').insert({ ...d, ordem: (ult?.[0]?.ordem ?? 0) + 1 }).select().single()
  if (error) {
    console.error('[formulario-perguntas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar a pergunta.' })
  }
  await auditar(event, 'criou pergunta de formulário', 'formulario_pergunta', data.id)
  return data
})
