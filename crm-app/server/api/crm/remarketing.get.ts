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
  return (data ?? [])
    .filter(c => !MOTIVOS_SEM_REMARKETING.includes(c.motivo_perda ?? ''))
    .map(({ ultimo_contato_em, ultima_mensagem_em, ...c }) => ({
      ...c,
      ultimo_contato: [ultimo_contato_em, ultima_mensagem_em].filter(Boolean).sort().at(-1) ?? null,
    }))
})
