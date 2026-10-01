import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { moverInicial } from '../../../../utils/iniciaisSecretaria'

/** Muda a etapa (arrastar o card ou "Avançar"). Protocolada exige a data do protocolo. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/inicial-mover')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return moverInicial(await serverSupabaseClient(event), id, (await readBody(event)) ?? {})
})
