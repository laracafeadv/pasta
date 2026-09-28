import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/list')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)
  // ?todas=1 traz concluídas também, com cliente/caso vinculados — usado na tela /tarefas.
  let query = q.todas === '1'
    ? client.from('tarefas_internas').select('*, contato:contatos(id, nome), caso:casos(id, titulo)').order('concluida').order('prazo', { nullsFirst: false }).order('created_at')
    : client.from('tarefas_internas').select('*').eq('concluida', false).order('created_at')
  const { data, error } = await query
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar tarefas.' })
  }
  return data ?? []
})
