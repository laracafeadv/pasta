import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../utils/security'

/** Quem pode ser responsável por uma demanda: administradora e equipe do escritório. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'equipe/list')
  const { data, error } = await (await serverSupabaseClient(event)).from('profiles').select('id, name, role').in('role', ['admin', 'equipe']).order('name')
  if (error) throw createError({ statusCode: 500, message: 'Erro ao carregar a equipe.' })
  return (data ?? []) as { id: string; name: string | null; role: string }[]
})
