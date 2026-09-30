import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { configGoogle } from '../../utils/googleConfig'
import { emailDaConta, salvarConexao, trocarCodigo, verificarEstado } from '../../utils/google'

/** Volta do Google: confere o "state" (amarrado à usuária), troca o código pelos tokens e guarda a conexão cifrada. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'google/callback')
  const cfg = configGoogle(event)
  const q = getQuery(event)
  if (!cfg.configurado) return sendRedirect(event, '/secretaria?google=nao-configurado', 302)
  if (q.error) return sendRedirect(event, '/secretaria?google=negado', 302)
  if (verificarEstado(String(q.state ?? ''), cfg.clientSecret) !== userId || !q.code) return sendRedirect(event, '/secretaria?google=erro', 302)
  try {
    const t = await trocarCodigo(cfg, String(q.code))
    await salvarConexao(serverSupabaseServiceRole(event), userId, t, await emailDaConta(t.access_token), cfg.clientSecret)
    return sendRedirect(event, '/secretaria?google=ok', 302)
  } catch (e: any) {
    console.error('[google/callback]', e?.message)
    return sendRedirect(event, '/secretaria?google=erro', 302)
  }
})
