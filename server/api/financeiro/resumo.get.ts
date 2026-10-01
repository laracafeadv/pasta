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
    admin.from('honorarios').select('contato_id, valor, status, tipo, data_contratacao, valor_mensal, meses').limit(5000),
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
    // O pró-labore não é lançado em Contas: entra como saída projetada todo mês.
    const projetadas = recorrentes.filter(r => r.vencimento.slice(0, 7) < mes).reduce((s, r) => s + Number(r.valor), 0) + (Number(escritorio.pro_labore) || 0)
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

  // ── Faturamento × receita × pró-labore do mês (Módulo 1) ──────────────────
  // Faturamento = contratos fechados no mês (o que foi vendido); receita = o que entrou no caixa.
  const fechados = (honor ?? []).filter(h => ['Contratado', 'Pago'].includes(h.status))
  const totalContrato = (h: any) => Number(h.valor) + (Number(h.valor_mensal) || 0) * (Number(h.meses) || 0)
  const faturamento = fechados.filter(h => (h.data_contratacao ?? '').slice(0, 7) === mesAtual).reduce((s, h) => s + totalContrato(h), 0)
  const receita = L.filter(l => l.tipo === 'receber' && (l.pago_em ?? '').slice(0, 7) === mesAtual).reduce((s, l) => s + Number(l.valor), 0)
  const despesasPagas = L.filter(l => l.tipo === 'pagar' && (l.pago_em ?? '').slice(0, 7) === mesAtual).reduce((s, l) => s + Number(l.valor), 0)
  const proLabore = Number(escritorio.pro_labore) || 0
  const mes = { mes: mesAtual, faturamento, receita, despesasPagas, proLabore, sobra: receita - despesasPagas - proLabore }

  // ── Ticket médio real por demanda (contratos fechados) ─────────────────────
  // Consulta fica fora: é porta de entrada, não o preço da demanda.
  const casos = fechados.filter(h => h.tipo !== 'Consulta')
  const ids = [...new Set(casos.map(h => h.contato_id))]
  const { data: dem } = ids.length ? await admin.from('contatos').select('id, demanda, area').in('id', ids) : { data: [] }
  const demandaDe = new Map((dem ?? []).map(c => [c.id, c.demanda || c.area || 'Sem demanda']))
  const porDemanda = new Map<string, number[]>()
  for (const h of casos) {
    const d = demandaDe.get(h.contato_id) ?? 'Sem demanda'
    porDemanda.set(d, [...(porDemanda.get(d) ?? []), totalContrato(h)])
  }
  const ticket = [...porDemanda].map(([demanda, vs]) => ({ demanda, contratos: vs.length, medio: vs.reduce((a, b) => a + b, 0) / vs.length }))
    .sort((a, b) => b.contratos - a.contratos)

  return { hoje, fluxo, atrasados, custos, rentabilidade: rent, mes, ticket }
})
