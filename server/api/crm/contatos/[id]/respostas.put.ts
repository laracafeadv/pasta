import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { normalizarRespostaCliente } from '../../../../utils/formularioPerguntas'
import { auditar } from '../../../../utils/auditoria'

// Edição rápida na ficha: uma pergunta por vez, com a mesma validação do formulário.
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/respostas/put')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ pergunta_id?: number; caso_id?: number | null; resposta?: unknown }>(event)
  const casoId = Number(body?.caso_id) || null
  const perguntaId = Number(body?.pergunta_id)
  if (!Number.isInteger(perguntaId) || perguntaId <= 0) throw createError({ statusCode: 400, message: 'Pergunta inválida.' })

  const client = await serverSupabaseClient(event)
  const { data: p } = await client.from('formulario_perguntas').select('id, tipo, opcoes, escopo').eq('id', perguntaId).single()
  if (!p) throw createError({ statusCode: 404, message: 'Pergunta não encontrada.' })
  if ((p.escopo === 'demanda') !== !!casoId) throw createError({ statusCode: 400, message: 'Essa pergunta pertence a outro nível (cliente × demanda).' })
  if (casoId) {
    const { data: caso } = await client.from('casos').select('id').eq('id', casoId).eq('contato_id', id).maybeSingle()
    if (!caso) throw createError({ statusCode: 404, message: 'Demanda não encontrada.' })
  }
  const resposta = normalizarRespostaCliente(p.tipo, p.opcoes ?? [], body?.resposta)

  const tabela = casoId ? 'caso_respostas' : 'contato_respostas'
  const chave = casoId ? { caso_id: casoId } : { contato_id: id }
  if (resposta == null) {
    await client.from(tabela).delete().match({ ...chave, pergunta_id: perguntaId })
  } else {
    const { error } = await client.from(tabela)
      .upsert({ ...chave, pergunta_id: perguntaId, resposta, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: `${casoId ? 'caso_id' : 'contato_id'},pergunta_id` })
    if (error) {
      console.error('[crm/respostas] Erro:', error)
      throw createError({ statusCode: 500, message: 'Não foi possível salvar.' })
    }
  }
  await auditar(event, 'atualizou informação do cliente', 'contato', id, { pergunta_id: perguntaId, caso_id: casoId })
  return { resposta, respondido_em: resposta == null ? null : new Date().toISOString() }
})
