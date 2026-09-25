import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'escritorio/get')
  return carregarEscritorio(serverSupabaseServiceRole(event))
})
