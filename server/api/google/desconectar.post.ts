import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { configGoogle } from '../../utils/googleConfig'
import { removerConexao } from '../../utils/google'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'google/desconectar')
  const cfg = configGoogle(event)
  await removerConexao(serverSupabaseServiceRole(event), userId, cfg.configurado ? cfg : undefined)
  await auditar(event, 'desconectou a conta Google', 'google', userId)
  return { success: true }
})
