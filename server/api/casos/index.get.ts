import { serverSupabaseClient } from '#supabase/server'
import type { Caso } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { sanitizarBusca } from '../../utils/crm'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'casos/list')
  const q = getQuery(event)
  let query = (await serverSupabaseClient(event)).from('casos').select('*, contato:contatos(id, nome)').order('updated_at', { ascending: false }).limit(300)
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  if (q.tipo) query = query.eq('tipo', String(q.tipo))
  if (q.status) query = query.eq('status', String(q.status))
  const busca = sanitizarBusca(q.search)
  if (busca) query = query.or(`titulo.ilike.%${busca}%,numero_processo.ilike.%${busca}%,parte_contraria.ilike.%${busca}%`)
  const { data, error } = await query
  if (error) {
    console.error('[casos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar casos.' })
  }
  return (data ?? []) as Caso[]
})
