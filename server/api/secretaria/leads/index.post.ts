import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { criarLead } from '../../../utils/leadsSecretaria'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lead-criar')
  const l = await criarLead(await serverSupabaseClient(event), userId, (await readBody(event)) ?? {})
  await auditar(event, 'criou lead (Secretária)', 'lead', l.id, { origem: l.origem })
  return l
})
