import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { registrarConversa } from '../../../../utils/leadsSecretaria'

/** "Respondi agora" (quem = respondi) ou "Cliente me mandou mensagem" (quem = cliente). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/lead-conversa')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return registrarConversa(await serverSupabaseClient(event), id, ((await readBody(event)) ?? {}).quem)
})
