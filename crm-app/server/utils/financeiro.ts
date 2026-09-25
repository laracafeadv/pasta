import type { SupabaseClient } from '@supabase/supabase-js'
import { precoMinimo, type Escritorio } from '../../shared/types/crm'

/** Horas de trabalho estimadas por demanda (ponto de partida; a administração ajusta na tela Financeiro). */
export const HORAS_PADRAO: Record<string, number> = {
  'Divórcio': 20, 'União estável': 12, 'Guarda e convivência': 25, 'Pensão alimentícia': 15,
  'Inventário': 30, 'Partilha de bens': 25, 'Testamento': 8, 'Planejamento sucessório': 15,
  'Pacto antenupcial': 6, 'Contrato de convivência': 6, 'Regime de bens': 4,
  'Parecer': 6, 'Consultoria contínua': 10,
}

export interface Custos {
  custoMensal: number
  horasProdutivas: number
  custoHora: number
  margem: number
  horas: Record<string, number>
  precos: { demanda: string; horas: number; minimo: number }[]
}

/**
 * Custo operacional = despesas fixas mensais (lançamentos "a pagar" marcados como recorrentes).
 * Custo da hora = custo mensal ÷ horas produtivas do mês. Preço mínimo = horas × custo/hora × (1 + margem).
 */
export async function calcularCustos(admin: SupabaseClient, e: Escritorio): Promise<Custos> {
  const { data } = await admin.from('lancamentos').select('valor').eq('tipo', 'pagar').eq('recorrente', true)
  const custoMensal = (data ?? []).reduce((s, l) => s + Number(l.valor), 0)
  const horasProdutivas = Math.max(1, Number(e.horas_produtivas_mes) || 120)
  const margem = Number.isFinite(Number(e.margem_desejada)) && e.margem_desejada ? Number(e.margem_desejada) : 30
  let horas = { ...HORAS_PADRAO }
  try {
    const salvo = e.horas_estimadas ? JSON.parse(e.horas_estimadas) : null
    if (salvo && typeof salvo === 'object') horas = { ...horas, ...salvo }
  } catch { /* JSON inválido: usa o padrão */ }
  const custoHora = custoMensal / horasProdutivas
  return {
    custoMensal,
    horasProdutivas,
    custoHora,
    margem,
    horas,
    precos: Object.entries(horas).map(([demanda, h]) => ({ demanda, horas: Number(h), minimo: precoMinimo(Number(h), custoHora, margem) })),
  }
}
