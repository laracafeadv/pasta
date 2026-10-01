import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { excluirLead } from '../../../utils/leadsSecretaria'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/lead-excluir')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const r = await excluirLead(await serverSupabaseClient(event), id)
  await auditar(event, 'excluiu lead (Secretária)', 'lead', id)
  return r
})
