import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { listarIniciais } from '../../../utils/iniciaisSecretaria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/iniciais')
  return listarIniciais(await serverSupabaseClient(event))
})
