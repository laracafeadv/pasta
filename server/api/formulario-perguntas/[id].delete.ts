import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

// Arquiva em vez de apagar: perguntas já usadas em formulários (ou em respostas antigas,
// que guardam o próprio texto/tipo) não podem sumir de baixo de ninguém.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/archive')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  if (getQuery(event).definitivo === '1') {
    // Exclusão de verdade só para pergunta que nunca foi respondida na ficha; senão, arquivar.
    const { count } = await client.from('contato_respostas').select('contato_id', { count: 'exact', head: true }).eq('pergunta_id', id)
    if (count) throw createError({ statusCode: 409, message: `Essa pergunta tem ${count} resposta(s) guardadas em clientes. Arquive-a: ela some da ficha e dos formulários novos, e o histórico fica preservado.` })
    await client.from('formulario_itens').delete().eq('pergunta_id', id)
    const { error: e2 } = await client.from('formulario_perguntas').delete().eq('id', id)
    if (e2) throw createError({ statusCode: 500, message: 'Erro ao excluir a pergunta.' })
    await auditar(event, 'excluiu pergunta de formulário', 'formulario_pergunta', id)
    return { success: true }
  }
  const { error } = await client.from('formulario_perguntas').update({ arquivada: true }).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao arquivar a pergunta.' })
  await auditar(event, 'arquivou pergunta de formulário', 'formulario_pergunta', id)
  return { success: true }
})
