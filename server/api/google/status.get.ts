import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { configGoogle } from '../../utils/googleConfig'
import { lerConexao } from '../../utils/google'
import type { GoogleStatus } from '../../../shared/data/secretaria'

/** A conta Google da usuária está conectada? O servidor está configurado para isso? */
export default defineEventHandler(async (event): Promise<GoogleStatus> => {
  const { userId } = await requireStaff(event, 'google/status')
  const cfg = configGoogle(event)
  const c = cfg.configurado ? await lerConexao(serverSupabaseServiceRole(event), userId) : null
  return { configurado: cfg.configurado, conectado: !!c, email: c?.email ?? null, redirectUri: cfg.redirectUri }
})
