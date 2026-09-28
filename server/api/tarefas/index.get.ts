import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/list')
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('tarefas_internas').select('*').eq('concluida', false).order('created_at')
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar tarefas.' })
  }
  return data ?? []
})
