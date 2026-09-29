import { serverSupabaseClient } from '#supabase/server'
import type { Processo } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { sanitizarBusca } from '../../utils/crm'

// Lista de Processos e Procedimentos (judiciais e extrajudiciais) de todas as demandas.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'processos/list')
  const q = getQuery(event)
  const client = await serverSupabaseClient(event)
  let query = client.from('processos').select('*, caso:casos(id, titulo, tipo), contato:contatos(id, nome)').order('updated_at', { ascending: false }).limit(300)
  if (q.natureza) query = query.eq('natureza', String(q.natureza))
  if (q.status) query = query.eq('status', String(q.status))
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  if (q.caso) query = query.eq('caso_id', Number(q.caso))
  const busca = sanitizarBusca(q.search)
  if (busca) {
    const { data: doCliente } = await client.from('contatos').select('id').ilike('nome', `%${busca}%`).limit(50)
    const ids = (doCliente ?? []).map(c => c.id)
    query = query.or(`numero.ilike.%${busca}%,orgao.ilike.%${busca}%${ids.length ? `,contato_id.in.(${ids.join(',')})` : ''}`)
  }
  const { data, error } = await query
  if (error) {
    console.error('[processos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os processos.' })
  }
  return (data ?? []) as Processo[]
})
