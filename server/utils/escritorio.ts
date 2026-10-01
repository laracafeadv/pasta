import type { SupabaseClient } from '@supabase/supabase-js'
import { CHAVES_EXTRAS, ESCRITORIO_CAMPOS, type Escritorio } from '../../shared/types/crm'

export const CHAVES_PERMITIDAS = new Set<string>([...ESCRITORIO_CAMPOS.map(c => c.chave), ...CHAVES_EXTRAS])

export async function carregarEscritorio(client: SupabaseClient): Promise<Escritorio> {
  const { data, error } = await client.from('escritorio').select('chave, valor')
  if (error) console.error('[escritorio] Erro ao carregar:', error)
  const out: Escritorio = {}
  for (const r of data ?? []) if (CHAVES_PERMITIDAS.has(r.chave)) (out as any)[r.chave] = r.valor
  return out
}
