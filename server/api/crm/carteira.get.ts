import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { carregarCarteira } from '../../utils/carteira'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/carteira')
  return carregarCarteira(await serverSupabaseClient(event))
})
