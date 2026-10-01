import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { vincularPartePessoa } from '../../../utils/partes'
import { auditar } from '../../../utils/auditoria'

/** Liga uma parte digitada à mão a uma pessoa cadastrada (existente ou nova). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'partes/vincular')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody(event)) ?? {}
  const r = await vincularPartePessoa(event, await serverSupabaseClient(event), id, { ...b, pessoa_id: Number(b.pessoa_id) || null }, userId)
  await auditar(event, 'vinculou parte a pessoa', 'parte', id, { contato_id: r.pessoa.id })
  return r
})
