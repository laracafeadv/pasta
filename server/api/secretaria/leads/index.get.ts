import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { listarLeads } from '../../../utils/leadsSecretaria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/leads')
  return listarLeads(await serverSupabaseClient(event))
})
