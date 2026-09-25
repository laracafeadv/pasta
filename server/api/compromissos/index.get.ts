import { serverSupabaseClient } from '#supabase/server'
import type { Compromisso } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'compromissos/list')
  const q = getQuery(event)
  let query = (await serverSupabaseClient(event))
    .from('compromissos')
    .select('*, contato:contatos(id, nome), caso:casos(id, titulo, numero_processo)')
    .order('data_limite', { ascending: true, nullsFirst: false })
    .order('inicio', { ascending: true })
    .limit(500)
  query = query.eq('status', String(q.status || 'pendente'))
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  if (q.tipo) query = query.eq('tipo', String(q.tipo))
  const { data, error } = await query
  if (error) {
    console.error('[compromissos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar a agenda.' })
  }
  return (data ?? []) as Compromisso[]
})
