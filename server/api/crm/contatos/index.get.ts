import { serverSupabaseClient } from '#supabase/server'
import type { Contato } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { sanitizarBusca } from '../../../utils/crm'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/list')
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)

  const page = Math.max(1, Number(query.page ?? 1) || 1)
  const pageSize = Math.min(Number(query.pageSize ?? 25) || 25, 200)
  const from = (page - 1) * pageSize

  let q = client
    .from('contatos')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, from + pageSize - 1)

  const search = sanitizarBusca(query.search)
  if (search) {
    q = q.or(`nome.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search.replace(/\D/g, '') || search}%,parte_contraria.ilike.%${search}%,resumo.ilike.%${search}%`)
  }
  if (query.etapa) q = q.eq('etapa', String(query.etapa))
  else if (query.abertos === '1') q = q.not('etapa', 'in', '(concluido,perdido)')
  if (query.area) q = q.eq('area', String(query.area))
  if (query.origem) q = q.eq('origem', String(query.origem))

  const { data, error, count } = await q
  if (error) {
    console.error('[crm] Erro ao buscar contatos:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao buscar contatos.' })
  }

  return { records: (data ?? []) as Contato[], total: count ?? 0, page, pageSize }
})
