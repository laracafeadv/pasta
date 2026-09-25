import type { SupabaseClient } from '@supabase/supabase-js'
import { CHAVES_EXTRAS, ESCRITORIO_CAMPOS, MAPA_EMPATIA, type Escritorio } from '../../shared/types/crm'

export const CHAVES_PERMITIDAS = new Set<string>([...ESCRITORIO_CAMPOS.map(c => c.chave), ...CHAVES_EXTRAS])

export async function carregarEscritorio(client: SupabaseClient): Promise<Escritorio> {
  const { data, error } = await client.from('escritorio').select('chave, valor')
  if (error) console.error('[escritorio] Erro ao carregar:', error)
  const out: Escritorio = {}
  for (const r of data ?? []) if (CHAVES_PERMITIDAS.has(r.chave)) (out as any)[r.chave] = r.valor
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
  // Posicionamento: a Ana fala como o escritório fala e sabe o que não é atendido aqui.
  const posicionamento = [
    e.proposta_valor?.trim() && `- Proposta de valor do escritório (guia o seu jeito de explicar o trabalho, não repita literalmente): ${e.proposta_valor.trim()}`,
    e.tom_de_voz?.trim() && `- Tom de voz obrigatório nas mensagens: ${e.tom_de_voz.trim()}`,
    e.nao_atende?.trim() && `- Casos que o escritório NÃO atende (trate como fora da área, com elegância, e diga o encaminhamento se houver): ${e.nao_atende.trim()}`,
  ].filter(Boolean)
  if (posicionamento.length) preenchidas.push(...(posicionamento as string[]))
  return preenchidas.length
    ? `# Dados do escritório (informações oficiais; use quando perguntarem)\n${preenchidas.join('\n')}`
    : '# Dados do escritório\nAinda não configurados: para valores e horários, diga que a equipe envia as informações.'
}

/**
 * Mapa da Empatia: como a cliente ideal fala, sente e pensa. Serve só para a Ana
 * ajustar a linguagem (acolher o que ela sente, usar as palavras dela), nunca para
 * supor fatos sobre a pessoa que está conversando.
 */
export function blocoMapaParaAna(e: Escritorio): string {
  const blocos = MAPA_EMPATIA.filter(m => e[m.chave]?.trim()).map(m => `- ${m.bloco}: ${e[m.chave]!.trim()}`)
  if (!blocos.length) return ''
  return `# Quem costuma procurar o escritório (Mapa da Empatia)
Use para falar na língua dela e acolher o que ela costuma sentir. Não presuma que a pessoa desta conversa é assim; confirme perguntando.
${blocos.join('\n')}`
}
