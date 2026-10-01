import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { atualizarLead } from '../../../utils/leadsSecretaria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/lead-editar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return atualizarLead(await serverSupabaseClient(event), id, (await readBody(event)) ?? {})
})
