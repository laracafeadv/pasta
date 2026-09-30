import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { montarInicio } from '../../utils/secretaria'

/** Tudo que o Início da Secretária mostra, em uma chamada. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/inicio')
  return montarInicio(await serverSupabaseClient(event), userId)
})
