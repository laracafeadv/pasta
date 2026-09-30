import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { atualizarParte } from '../../utils/partes'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'partes/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return atualizarParte(event, await serverSupabaseClient(event), id, (await readBody(event)) ?? {}, userId)
})
