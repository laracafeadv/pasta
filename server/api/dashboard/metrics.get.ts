import { serverSupabaseClient } from '#supabase/server'
import { STATUS_RECEITA } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

interface DashboardMetricRow {
  date: string
  novos_clientes: number       // novos contatos no dia
  clientes_recorrentes: number // contatos que voltaram a escrever no WhatsApp no dia
  vendas: number               // honorários contratados/pagos no dia
  valor_vendas: number         // soma desses honorários
}

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'dashboard/metrics')

  const { startDate, endDate } = getQuery(event)
  const inicio = new Date(String(startDate ?? ''))
  const fim = new Date(String(endDate ?? ''))
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    throw createError({ statusCode: 400, message: 'Os parâmetros startDate e endDate devem ser datas válidas.' })
  }

  const client = await serverSupabaseClient(event)
  const [contatos, honorarios, mensagens] = await Promise.all([
    client.from('contatos').select('id, created_at').gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString()),
    client.from('honorarios').select('created_at, data_contratacao, valor, status').in('status', STATUS_RECEITA)
      .gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString()),
    client.from('mensagens_whatsapp').select('contato_id, created_at').eq('direcao', 'entrada')
      .gte('created_at', inicio.toISOString()).lte('created_at', fim.toISOString()).limit(20000),
  ])

  const erro = contatos.error || honorarios.error || mensagens.error
  if (erro) {
    console.error('[dashboard/metrics] Erro ao buscar métricas:', erro)
    throw createError({ statusCode: 500, message: 'Erro interno ao buscar métricas do painel.' })
  }

  const mapa = new Map<string, { novos: Set<number>; recorrentes: Set<number>; vendas: number; valor: number }>()
  const dia = (d: string) => {
    const k = d.slice(0, 10)
    if (!mapa.has(k)) mapa.set(k, { novos: new Set(), recorrentes: new Set(), vendas: 0, valor: 0 })
    return mapa.get(k)!
  }

  const novosIds = new Set<number>()
  for (const c of contatos.data ?? []) { dia(c.created_at).novos.add(c.id); novosIds.add(c.id) }
  for (const m of mensagens.data ?? []) {
    const d = dia(m.created_at)
    if (!d.novos.has(m.contato_id)) d.recorrentes.add(m.contato_id)
  }
  for (const h of honorarios.data ?? []) {
    const d = dia(h.data_contratacao || h.created_at)
    d.vendas += 1
    d.valor += Number(h.valor || 0)
  }

  const metrics: DashboardMetricRow[] = [...mapa.entries()]
    .map(([date, d]) => ({ date, novos_clientes: d.novos.size, clientes_recorrentes: d.recorrentes.size, vendas: d.vendas, valor_vendas: d.valor }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { metrics }
})
