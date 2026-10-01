import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { atualizarInicial } from '../../../utils/iniciaisSecretaria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/inicial-editar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  return atualizarInicial(await serverSupabaseClient(event), id, (await readBody(event)) ?? {})
})
