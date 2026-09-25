import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'financeiro/lancamentos')
  const q = getQuery(event)
  let query = serverSupabaseServiceRole(event)
    .from('lancamentos')
    .select('*, contato:contatos(id, nome)')
    .order('vencimento', { ascending: true })
    .limit(1000)
  if (q.tipo === 'receber' || q.tipo === 'pagar') query = query.eq('tipo', q.tipo)
  if (typeof q.de === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.de)) query = query.gte('vencimento', q.de)
  if (typeof q.ate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.ate)) query = query.lte('vencimento', q.ate)
  const { data, error } = await query
  if (error) {
    console.error('[financeiro] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao listar lançamentos.' })
  }
  return data ?? []
})
