import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'qualidade/revisoes')
  const { data, error } = await (await serverSupabaseClient(event))
    .from('revisoes')
    .select('*, caso:casos(id, titulo, contato:contatos(id, nome)), revisor:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    console.error('[qualidade] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao listar revisões.' })
  }
  return data ?? []
})
