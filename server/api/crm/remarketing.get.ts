import { serverSupabaseClient } from '#supabase/server'
import { MOTIVOS_SEM_REMARKETING } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

/**
 * Quem não fechou (coluna "Remarketing" do quadro antigo): fica no radar por demanda,
 * para receber conteúdo do interesse dela. Fora da área e conflito de interesses não entram.
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/remarketing')
  const { data, error } = await (await serverSupabaseClient(event))
    .from('contatos')
    .select('id, nome, telefone, area, demanda, origem, motivo_perda, created_at, etapa_desde, ultimo_contato_em, ultima_mensagem_em, nao_contatar')
    .eq('etapa', 'perdido')
    .order('etapa_desde', { ascending: false })
    .limit(2000)
  if (error) {
    console.error('[remarketing] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao carregar o remarketing.' })
  }
  const lista = (data ?? []).filter(c => !MOTIVOS_SEM_REMARKETING.includes(c.motivo_perda ?? ''))
  // Última proposta de cada um ("Proposta enviada dia X, valor R$ Y", como no cartão antigo).
  const ids = lista.map(c => c.id)
  const { data: props } = ids.length
    ? await (await serverSupabaseClient(event)).from('honorarios').select('contato_id, valor, created_at').in('contato_id', ids).neq('tipo', 'Consulta').order('created_at', { ascending: false }).limit(2000)
    : { data: [] as { contato_id: number; valor: number; created_at: string }[] }
  return lista
    .map(({ ultimo_contato_em, ultima_mensagem_em, ...c }) => ({
      ...c,
      proposta: (props ?? []).find(p => p.contato_id === c.id) ?? null,
      ultimo_contato: [ultimo_contato_em, ultima_mensagem_em].filter(Boolean).sort().at(-1) ?? null,
    }))
})
