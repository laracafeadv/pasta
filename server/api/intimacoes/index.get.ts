import { serverSupabaseClient } from '#supabase/server'
import type { Intimacao } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

/** Fila de intimações. ?status=a_tratar (padrão) | tratada | todas; ?processo= ; ?contato= */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'intimacoes/list')
  const q = getQuery(event)
  let query = (await serverSupabaseClient(event)).from('intimacoes')
    .select('*, processo:processos(id, numero, tribunal, orgao, status), caso:casos(id, titulo), contato:contatos(id, nome), compromisso:compromissos(id, data_limite, status), tarefa:tarefas_internas(id, prazo, concluida)')
    .order('data_publicacao', { ascending: false }).limit(300)
  const status = String(q.status ?? 'a_tratar')
  if (status !== 'todas') query = query.eq('status', status === 'tratada' ? 'tratada' : 'a_tratar')
  if (q.processo) query = query.eq('processo_id', Number(q.processo))
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  const { data, error } = await query
  if (error) {
    console.error('[intimacoes] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar as intimações.' })
  }
  return (data ?? []) as unknown as Intimacao[]
})
