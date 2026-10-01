import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { removerParte } from '../../utils/partes'
import { auditar } from '../../utils/auditoria'

/** Desvincula a parte da demanda. A pessoa cadastrada NÃO é apagada. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'partes/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const r = await removerParte(event, await serverSupabaseClient(event), id, userId)
  await auditar(event, 'removeu parte', 'parte', id)
  return r
})
