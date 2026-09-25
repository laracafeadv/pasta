import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'admin/auditoria')
  const q = getQuery(event)
  const page = Math.max(1, Number(q.page ?? 1) || 1)
  const pageSize = 50
  const from = (page - 1) * pageSize

  let query = serverSupabaseServiceRole(event)
    .from('auditoria')
    .select('*', { count: 'exact' })
    .order('quando', { ascending: false })
    .range(from, from + pageSize - 1)
  if (q.entidade) query = query.eq('entidade', String(q.entidade))

  const { data, error, count } = await query
  if (error) {
    console.error('[admin/auditoria] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar a auditoria.' })
  }
  return { registros: data ?? [], total: count ?? 0, page, pageSize }
})
