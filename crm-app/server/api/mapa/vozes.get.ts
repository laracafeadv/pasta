import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/security'
import { carregarVozes } from '../../utils/mapa'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'mapa/vozes')
  return carregarVozes(serverSupabaseServiceRole(event))
})
