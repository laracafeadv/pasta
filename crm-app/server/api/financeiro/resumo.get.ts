import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'
import { calcularCustos } from '../../utils/financeiro'
import { hojeBR } from '../../utils/crm'

/**
 * Painel financeiro: fluxo de caixa projetado (6 meses), custo operacional e da hora,
 * preço mínimo por demanda e rentabilidade por cliente.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'financeiro/resumo')
  const admin = serverSupabaseServiceRole(event)
  const escritorio = await carregarEscritorio(admin)
  const custos = await calcularCustos(admin, escritorio)
  const hoje = hojeBR()

  const [{ data: lanc }, { data: honor }, { data: ativs }, { data: contatos }] = await Promise.all([
    admin.from('lancamentos').select('tipo, valor, vencimento, pago_em, recorrente, contato_id, honorario_id').limit(5000),
    admin.from('honorarios').select('contato_id, valor, status').limit(5000),
    admin.from('atividades').select('contato_id, minutos').not('minutos', 'is', null).limit(10000),
    admin.from('contatos').select('id, nome, area, demanda').or('etapa.in.(ativo,concluido)').limit(2000),
  ])
  const L = lanc ?? []

  // ── Fluxo de caixa: mês atual + 5 seguintes ────────────────────────────────
  const mesAtual = hoje.slice(0, 7)
  const meses = Array.from({ length: 6 }, (_, i) => {
    const [a, m] = mesAtual.split('-').map(Number)
    const d = new Date(Date.UTC(a!, m! - 1 + i, 1))
    return d.toISOString().slice(0, 7)
  })
  const recorrentes = L.filter(l => l.tipo === 'pagar' && l.recorrente)
  let saldo = Number(escritorio.saldo_caixa) || 0
  const fluxo = meses.map((mes) => {
    const doMes = L.filter(l => l.vencimento.slice(0, 7) === mes)
    const soma = (arr: typeof L) => arr.reduce((s, l) => s + Number(l.valor), 0)
    const entradas = soma(doMes.filter(l => l.tipo === 'receber'))
    let saidas = soma(doMes.filter(l => l.tipo === 'pagar'))
    // Despesa recorrente ainda não lançada neste mês entra como projeção.
    const projetadas = recorrentes.filter(r => r.vencimento.slice(0, 7) < mes).reduce((s, r) => s + Number(r.valor), 0)
    saidas += projetadas
    const recebido = soma(doMes.filter(l => l.tipo === 'receber' && l.pago_em))
    const pago = soma(doMes.filter(l => l.tipo === 'pagar' && l.pago_em))
    saldo += entradas - saidas
    return { mes, entradas, saidas, projetadas, recebido, pago, resultado: entradas - saidas, saldo }
  })
  const atrasados = {
    receber: L.filter(l => l.tipo === 'receber' && !l.pago_em && l.vencimento < hoje).reduce((s, l) => s + Number(l.valor), 0),
    pagar: L.filter(l => l.tipo === 'pagar' && !l.pago_em && l.vencimento < hoje).reduce((s, l) => s + Number(l.valor), 0),
  }

  // ── Rentabilidade por cliente ──────────────────────────────────────────────
  const rent = (contatos ?? []).map((c) => {
    const meus = L.filter(l => l.contato_id === c.id)
    const recebidoLanc = meus.filter(l => l.tipo === 'receber' && l.pago_em).reduce((s, l) => s + Number(l.valor), 0)
    // Sem parcelas lançadas, usa os honorários marcados como pagos.
    const recebido = meus.some(l => l.tipo === 'receber')
      ? recebidoLanc
      : (honor ?? []).filter(h => h.contato_id === c.id && h.status === 'Pago').reduce((s, h) => s + Number(h.valor), 0)
    const contratado = (honor ?? []).filter(h => h.contato_id === c.id && ['Contratado', 'Pago'].includes(h.status)).reduce((s, h) => s + Number(h.valor), 0)
    const despesas = meus.filter(l => l.tipo === 'pagar').reduce((s, l) => s + Number(l.valor), 0)
    const minutos = (ativs ?? []).filter(a => a.contato_id === c.id).reduce((s, a) => s + (Number(a.minutos) || 0), 0)
    const custoTempo = (minutos / 60) * custos.custoHora
    const resultado = recebido - despesas - custoTempo
    return {
      contato_id: c.id, nome: c.nome, demanda: c.demanda, contratado, recebido, despesas,
      horas: Math.round((minutos / 60) * 10) / 10, custoTempo, resultado,
      valorHora: minutos ? recebido / (minutos / 60) : null,
    }
  }).filter(r => r.contratado || r.recebido || r.despesas || r.horas)
    .sort((a, b) => a.resultado - b.resultado)

  return { hoje, fluxo, atrasados, custos, rentabilidade: rent }
})
