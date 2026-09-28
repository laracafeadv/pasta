import { serverSupabaseClient } from '#supabase/server'
import type { Recibo } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'recibos/list')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)
  let query = client.from('recibos').select('*, contato:contatos(nome)').order('created_at', { ascending: false }).limit(300)
  if (q.contato_id) query = query.eq('contato_id', Number(q.contato_id))
  const { data, error } = await query
  if (error) {
    console.error('[recibos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os recibos.' })
  }
  return (data ?? []).map((r: any) => ({ ...r, contato_nome: r.contato?.nome ?? null })) as Recibo[]
})
