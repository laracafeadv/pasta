import { serverSupabaseClient } from '#supabase/server'
import type { Honorario } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'honorarios/list')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)

  const page = Math.max(1, Number(q.page ?? 1) || 1)
  const pageSize = Math.min(Number(q.pageSize ?? 25) || 25, 100)
  const from = (page - 1) * pageSize

  let query = client
    .from('honorarios')
    .select('*, contato:contatos(id, nome, telefone)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (q.status) query = query.eq('status', String(q.status))
  if (q.tipo) query = query.eq('tipo', String(q.tipo))
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  if (q.startDate) query = query.gte('created_at', String(q.startDate))
  if (q.endDate) query = query.lte('created_at', String(q.endDate))

  const { data, error, count } = await query
  if (error) {
    console.error('[honorarios] Erro ao listar:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao buscar honorários.' })
  }
  return { honorarios: (data ?? []) as Honorario[], total: count ?? 0, page, pageSize }
})
