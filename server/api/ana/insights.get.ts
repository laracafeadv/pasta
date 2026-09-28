import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'ana/insights')
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('ana_insights').select('*').order('created_at', { ascending: false }).limit(30)
  if (error) {
    console.error('[ana/insights] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar ideias.' })
  }
  return data ?? []
})
