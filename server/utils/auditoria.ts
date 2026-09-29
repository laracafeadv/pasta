import type { H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

/**
 * Registra uma ação na auditoria (tabela imutável no banco).
 * Por LGPD, guarda apenas ids e NOMES de campos alterados, nunca os valores.
 * Nunca interrompe a ação principal: uma falha aqui só vai para o log.
 */
export async function auditar(event: H3Event, acao: string, entidade: string, entidadeId: string | number | null, detalhes: Record<string, unknown> = {}) {
  try {
    const admin = serverSupabaseServiceRole(event)
    let usuarioId: string | null = null
    let usuarioNome = 'Sistema'
    const user = await serverSupabaseUser(event).catch(() => null)
    if (user?.sub) {
      usuarioId = user.sub
      const { data } = await admin.from('profiles').select('name').eq('id', user.sub).maybeSingle()
      usuarioNome = data?.name || (user.email as string) || 'Usuário'
    } else if (entidade === 'whatsapp') {
      usuarioNome = 'Sistema (WhatsApp)'
    }
    const { error } = await admin.from('auditoria').insert({
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      acao,
      entidade,
      entidade_id: entidadeId == null ? null : String(entidadeId),
      detalhes,
    })
    if (error) console.error('[auditoria] Erro ao registrar:', error)
  } catch (e) {
    console.error('[auditoria] Falha:', e)
  }
}

/** Nomes dos campos que mudaram entre dois objetos (sem os valores). */
export function camposAlterados(antes: Record<string, any> | null, depois: Record<string, any>): string[] {
  if (!antes) return Object.keys(depois)
  return Object.keys(depois).filter(k => JSON.stringify(antes[k] ?? null) !== JSON.stringify(depois[k] ?? null))
}
