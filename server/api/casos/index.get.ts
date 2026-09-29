import { serverSupabaseClient } from '#supabase/server'
import type { Caso } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { sanitizarBusca } from '../../utils/crm'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'casos/list')
  const q = getQuery(event)
  let query = (await serverSupabaseClient(event)).from('casos').select('*, contato:contatos(id, nome), processos(id, natureza, numero, orgao, fase, status), partes(id, nome, papel)').order('updated_at', { ascending: false }).limit(300)
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  if (q.tipo) query = query.eq('tipo', String(q.tipo))
  if (q.status) query = query.eq('status', String(q.status))
  const busca = sanitizarBusca(q.search)
  if (busca) {
    // Acha pelo título ou por um processo/parte da demanda (número, nome).
    const client = await serverSupabaseClient(event)
    const [porProcesso, porParte] = await Promise.all([
      client.from('processos').select('caso_id').ilike('numero', `%${busca}%`).limit(50),
      client.from('partes').select('caso_id').ilike('nome', `%${busca}%`).limit(50),
    ])
    const ids = [...new Set([...(porProcesso.data ?? []), ...(porParte.data ?? [])].map(r => r.caso_id))]
    query = query.or(`titulo.ilike.%${busca}%${ids.length ? `,id.in.(${ids.join(',')})` : ''}`)
  }
  const { data, error } = await query
  if (error) {
    console.error('[casos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar casos.' })
  }
  return (data ?? []) as Caso[]
})
