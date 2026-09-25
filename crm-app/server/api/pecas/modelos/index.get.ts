import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'pecas/modelos')
  const { data, error } = await (await serverSupabaseClient(event)).from('pecas_modelos').select('*').order('categoria').order('titulo')
  if (error) throw createError({ statusCode: 500, message: 'Erro interno ao listar modelos de peças.' })
  return data ?? []
})
