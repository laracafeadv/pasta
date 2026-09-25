import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'documentos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ status?: string; observacao?: string | null }>(event)
  const upd: Record<string, unknown> = { atualizado_em: new Date().toISOString(), atualizado_por: userId }
  if (body?.status !== undefined) {
    if (!['pendente', 'recebido', 'dispensado'].includes(body.status)) throw createError({ statusCode: 400, message: 'Status inválido.' })
    upd.status = body.status
  }
  if (body?.observacao !== undefined) upd.observacao = body.observacao ? String(body.observacao).slice(0, 500) : null
  const { data, error } = await (await serverSupabaseClient(event)).from('documentos').update(upd).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao atualizar documento.' })
  return data
})
