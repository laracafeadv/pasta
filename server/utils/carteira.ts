import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClienteCarteira } from '../../shared/types/crm'

/**
 * Carteira = quem já foi cliente (ativo ou concluído) ou já recebeu uma classificação.
 * "Último contato" é o mais recente entre um gesto registrado e a última mensagem de WhatsApp.
 */
export async function carregarCarteira(client: SupabaseClient): Promise<ClienteCarteira[]> {
  const { data, error } = await client
    .from('contatos')
    .select('id, nome, telefone, etapa, area, demanda, classificacao, classificacao_desde, nps, obs_relacionamento, data_nascimento, ultimo_contato_em, ultima_mensagem_em')
    .or('etapa.in.(ativo,concluido),classificacao.not.is.null')
    .order('nome', { ascending: true })
    .limit(2000)
  if (error) {
    console.error('[carteira] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao carregar a carteira.' })
  }
  return (data ?? []).map(({ ultimo_contato_em, ultima_mensagem_em, ...c }) => ({
    ...c,
    ultimo_contato: [ultimo_contato_em, ultima_mensagem_em].filter(Boolean).sort().at(-1) ?? null,
  })) as ClienteCarteira[]
}
