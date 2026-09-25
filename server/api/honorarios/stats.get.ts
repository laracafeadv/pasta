import { serverSupabaseClient } from '#supabase/server'
import { STATUS_RECEITA } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'honorarios/stats')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)

  let query = client.from('honorarios').select('valor, status')
  if (q.startDate) query = query.gte('created_at', String(q.startDate))
  if (q.endDate) query = query.lte('created_at', String(q.endDate))

  const { data, error } = await query
  if (error) {
    console.error('[honorarios/stats] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao calcular honorários.' })
  }

  const soma = (status: string[]) => (data ?? []).filter(h => status.includes(h.status)).reduce((a, h) => a + Number(h.valor || 0), 0)
  const contratos = (data ?? []).filter(h => STATUS_RECEITA.includes(h.status))
  return {
    contratado: soma(STATUS_RECEITA),
    recebido: soma(['Pago']),
    emProposta: soma(['Proposta']),
    ticketMedio: contratos.length ? soma(STATUS_RECEITA) / contratos.length : 0,
    quantidade: contratos.length,
  }
})
