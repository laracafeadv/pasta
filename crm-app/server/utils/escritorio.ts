import type { SupabaseClient } from '@supabase/supabase-js'
import { ESCRITORIO_CAMPOS, type Escritorio } from '../../shared/types/crm'

export async function carregarEscritorio(client: SupabaseClient): Promise<Escritorio> {
  const { data, error } = await client.from('escritorio').select('chave, valor')
  if (error) console.error('[escritorio] Erro ao carregar:', error)
  const out: Escritorio = {}
  for (const r of data ?? []) if (ESCRITORIO_CAMPOS.some(c => c.chave === r.chave)) (out as any)[r.chave] = r.valor
  return out
}

/** Bloco de informações que a Ana pode usar (sem PIX: pagamento é tratado pela equipe). */
export function blocoEscritorioParaAna(e: Escritorio): string {
  const linhas: [string, string | undefined][] = [
    ['Advogada', e.advogada_nome ? `Dra. ${e.advogada_nome}${e.oab ? ` (OAB ${e.oab})` : ''}` : undefined],
    ['Valor da consulta', e.valor_consulta],
    ['Consulta abatida dos honorários se contratar', e.consulta_abatida],
    ['Duração média da consulta', e.duracao_consulta],
    ['Plataforma da videochamada', e.plataforma_consulta],
    ['Horário de atendimento da equipe', e.horario_atendimento],
  ]
  const preenchidas = linhas.filter(([, v]) => v?.trim()).map(([k, v]) => `- ${k}: ${v!.trim()}`)
  return preenchidas.length
    ? `# Dados do escritório (informações oficiais; use quando perguntarem)\n${preenchidas.join('\n')}`
    : '# Dados do escritório\nAinda não configurados: para valores e horários, diga que a equipe envia as informações.'
}
