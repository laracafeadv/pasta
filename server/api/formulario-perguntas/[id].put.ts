import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparPergunta } from '../../utils/formularioPerguntas'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody(event)
  const d = { ...limparPergunta(body), ...(body?.arquivada === false ? { arquivada: false } : {}) }
  const client = await serverSupabaseClient(event)
  // Trocar o tipo de uma pergunta já respondida deixaria respostas antigas incoerentes: só as opções e o texto mudam.
  const { data: atual } = await client.from('formulario_perguntas').select('tipo').eq('id', id).single()
  if (atual && atual.tipo !== d.tipo) {
    const [a, b] = await Promise.all([
      client.from('contato_respostas').select('contato_id', { count: 'exact', head: true }).eq('pergunta_id', id),
      client.from('caso_respostas').select('caso_id', { count: 'exact', head: true }).eq('pergunta_id', id),
    ])
    const count = (a.count ?? 0) + (b.count ?? 0)
    if (count) throw createError({ statusCode: 409, message: `Essa pergunta já tem ${count} resposta(s): não dá para mudar o tipo. Crie uma nova pergunta e arquive esta.` })
  }
  const { data, error } = await client.from('formulario_perguntas').update(d).eq('id', id).select().single()
  if (error) {
    console.error('[formulario-perguntas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao salvar a pergunta.' })
  }
  await auditar(event, 'editou pergunta de formulário', 'formulario_pergunta', id)
  return data
})
