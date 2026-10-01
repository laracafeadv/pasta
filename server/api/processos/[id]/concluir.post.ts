import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { concluirProcesso } from '../../../utils/processos'
import { auditar } from '../../../utils/auditoria'

/** Conclui o processo judicial ou o procedimento extrajudicial com um desfecho próprio da natureza. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/concluir')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const r = await concluirProcesso(event, await serverSupabaseClient(event), id, (await readBody(event)) ?? {}, userId)
  await auditar(event, 'concluiu processo', 'processo', id, { desfecho: r.desfecho })
  return r
})
