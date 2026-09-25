import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { CONTATO_CAMPOS_EDITAVEIS, ETAPAS, normalizarTelefone, pick, type ContatoInput } from '../../shared/types/crm'

/** Remove caracteres que alteram a sintaxe de filtros do PostgREST (.or / ilike). */
export function sanitizarBusca(raw: unknown): string {
  return String(raw ?? '').replace(/[,()*%\\:"']/g, ' ').trim().slice(0, 80)
}

/** Aplica lista branca e normalizações a um payload de contato vindo do cliente. */
export function limparContato(body: Record<string, any>): ContatoInput {
  const data = pick(body ?? {}, CONTATO_CAMPOS_EDITAVEIS) as Record<string, any>

  if ('telefone' in data) {
    data.telefone = normalizarTelefone(data.telefone)
    if (data.telefone.length < 10) throw createError({ statusCode: 400, message: 'Telefone inválido.' })
  }
  if ('etapa' in data && !ETAPAS.some(e => e.id === data.etapa)) {
    throw createError({ statusCode: 400, message: 'Etapa inválida.' })
  }
  for (const k of ['interesses', 'objecoes']) {
    if (k in data) data[k] = Array.isArray(data[k]) ? data[k].map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 20) : []
  }
  for (const [k, v] of Object.entries(data)) {
    if (v === '') data[k] = null
  }
  if (data.etapa && data.etapa !== 'perdido') data.motivo_perda = null
  if (data.etapa === 'perdido' && 'motivo_perda' in data && !data.motivo_perda) {
    throw createError({ statusCode: 400, message: 'Informe o motivo da perda.' })
  }
  return data as ContatoInput
}

/** Registra uma atividade no histórico do contato (falha silenciosa: nunca bloqueia a ação principal). */
export async function registrarAtividade(event: H3Event, contatoId: number, tipo: string, texto: string, autorId: string | null = null) {
  const { error } = await serverSupabaseServiceRole(event)
    .from('atividades')
    .insert({ contato_id: contatoId, tipo, texto: texto.slice(0, 4000), autor_id: autorId })
  if (error) console.error('[crm/atividades] Erro ao registrar atividade:', error)
}

/** Avisa todos os usuários admin/equipe (ex.: IA pediu atendimento humano). */
export async function notificarEquipe(event: H3Event, title: string, message: string, metadata: Record<string, unknown> = {}, type: 'info' | 'warning' = 'info') {
  const admin = serverSupabaseServiceRole(event)
  const { data: staff, error } = await admin.from('profiles').select('id').in('role', ['admin', 'equipe'])
  if (error || !staff?.length) {
    if (error) console.error('[notificacoes] Erro ao buscar equipe:', error)
    return
  }
  const { error: insertError } = await admin.from('notifications').insert(
    staff.map(s => ({ user_id: s.id, title, message, type, metadata, is_read: false })),
  )
  if (insertError) console.error('[notificacoes] Erro ao inserir notificações:', insertError)
}
