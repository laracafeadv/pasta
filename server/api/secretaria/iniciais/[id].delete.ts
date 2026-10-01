import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { excluirInicial } from '../../../utils/iniciaisSecretaria'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/inicial-excluir')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const r = await excluirInicial(await serverSupabaseClient(event), id)
  await auditar(event, 'excluiu inicial (Secretária)', 'inicial', id, {})
  return r
})
