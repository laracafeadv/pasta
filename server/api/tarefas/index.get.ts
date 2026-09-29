import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/list')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)
  // ?todas=1 traz concluídas também, com cliente/caso vinculados — usado na aba Tarefas de /clientes.
  let query = q.todas === '1'
    ? client.from('tarefas_internas').select('*, contato:contatos(id, nome), caso:casos(id, titulo)').order('concluida').order('prazo').order('created_at')
    : client.from('tarefas_internas').select('*, contato:contatos(id, nome), caso:casos(id, titulo)').eq('concluida', false).order('prazo').order('created_at')
  const { data, error } = await query
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar tarefas.' })
  }
  return data ?? []
})
