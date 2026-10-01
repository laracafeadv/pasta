import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { criarInicial } from '../../../utils/iniciaisSecretaria'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/inicial-criar')
  const i = await criarInicial(await serverSupabaseClient(event), userId, (await readBody(event)) ?? {})
  await auditar(event, 'criou inicial (Secretária)', 'inicial', i.id, { area: i.area })
  return i
})
