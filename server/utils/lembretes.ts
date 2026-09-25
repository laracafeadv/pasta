import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { TIPOS_COMPROMISSO, dataCompromisso, type Compromisso } from '../../shared/types/crm'
import { hojeBR } from './crm'

/**
 * Lembrete automático de prazos e audiências: avisa a pessoa responsável (ou toda a
 * equipe) quando faltam 3 dias, 1 dia ou é hoje. Marca lembrete_em para não repetir no mesmo dia.
 * Roda ao abrir a tela Hoje e pelo endpoint /api/cron/lembretes (agendador externo).
 */
export async function enviarLembretes(event: H3Event): Promise<number> {
  const admin = serverSupabaseServiceRole(event)
  const hoje = hojeBR()
  const alvo = new Set([hoje, hojeBR(1), hojeBR(3)])
  const { data } = await admin.from('compromissos')
    .select('id, tipo, titulo, inicio, data_limite, responsavel_id, lembrete_em, contato:contatos(nome)')
    .eq('status', 'pendente').in('tipo', ['prazo', 'audiencia']).limit(500)
  const pendentes = ((data ?? []) as unknown as (Compromisso & { responsavel_id: string | null; lembrete_em: string | null })[])
    .filter(c => alvo.has(dataCompromisso(c)) && c.lembrete_em !== hoje)
  if (!pendentes.length) return 0

  const { data: staff } = await admin.from('profiles').select('id').in('role', ['admin', 'equipe'])
  const todos = (staff ?? []).map(s => s.id)
  const notificacoes = pendentes.flatMap((c) => {
    const d = dataCompromisso(c)
    const quando = d === hoje ? 'HOJE' : d === hojeBR(1) ? 'amanhã' : 'em 3 dias'
    const para = c.responsavel_id ? [c.responsavel_id] : todos
    return para.map(user_id => ({
      user_id,
      title: `${TIPOS_COMPROMISSO[c.tipo].nome} ${quando}`,
      message: `${c.titulo}${c.contato?.nome ? ` — ${c.contato.nome}` : ''} (${d.split('-').reverse().join('/')})`,
      type: d === hoje ? 'warning' : 'info',
      metadata: { compromisso_id: c.id },
      is_read: false,
    }))
  })
  const { error } = await admin.from('notifications').insert(notificacoes)
  if (error) {
    console.error('[lembretes] Erro:', error)
    return 0
  }
  await admin.from('compromissos').update({ lembrete_em: hoje }).in('id', pendentes.map(c => c.id))
  return pendentes.length
}
