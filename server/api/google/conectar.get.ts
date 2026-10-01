import { requireStaff } from '../../utils/security'
import { configGoogle } from '../../utils/googleConfig'
import { assinarEstado, urlAutorizacao } from '../../utils/google'

/** Começa o login com o Google (abre a tela de permissão: Gmail somente leitura e criar eventos na Agenda). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'google/conectar')
  const cfg = configGoogle(event)
  if (!cfg.configurado) return sendRedirect(event, '/secretaria?google=nao-configurado', 302)
  return sendRedirect(event, urlAutorizacao(cfg, assinarEstado(userId, cfg.clientSecret)), 302)
})
