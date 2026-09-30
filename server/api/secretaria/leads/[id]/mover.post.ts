import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { moverLead } from '../../../../utils/leadsSecretaria'

/** Muda a etapa (arrastar o card, "Fechou contrato", "Não fechou"). Não fechou exige o motivo. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/lead-mover')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return moverLead(await serverSupabaseClient(event), id, (await readBody(event)) ?? {})
})
