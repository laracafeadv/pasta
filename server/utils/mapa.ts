import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * "Dados de verdade" para o Mapa da Empatia: o que as pessoas disseram na triagem,
 * sem nome nem telefone (só frases), dos últimos 180 dias.
 */
export async function carregarVozes(admin: SupabaseClient) {
  const desde = new Date(Date.now() - 180 * 864e5).toISOString()
  const { data, error } = await admin
    .from('contatos')
    .select('area, demanda, dor, objetivo, objecoes, origem, sentimento, created_at')
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw createError({ statusCode: 500, message: 'Erro interno ao carregar as vozes das clientes.' })
  const L = data ?? []
  const contar = (xs: (string | null)[]) => Object.entries(xs.filter(Boolean).reduce<Record<string, number>>((a, x) => { a[x!] = (a[x!] ?? 0) + 1; return a }, {}))
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
  return {
    total: L.length,
    dores: L.filter(c => c.dor).map(c => ({ texto: c.dor, area: c.area })).slice(0, 40),
    objetivos: L.filter(c => c.objetivo).map(c => ({ texto: c.objetivo, area: c.area })).slice(0, 40),
    objecoes: contar(L.flatMap(c => c.objecoes ?? [])),
    demandas: contar(L.map(c => c.demanda)),
    origens: contar(L.map(c => c.origem)),
  }
}
