import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { tratarIntimacao } from '../../../utils/intimacoes'
import { auditar } from '../../../utils/auditoria'

/** Marca como tratada (baixa no prazo e na tarefa) ou reabre ({ reabrir: true }). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'intimacoes/tratar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = (await readBody<{ obs?: string; reabrir?: boolean }>(event)) ?? {}
  const r = await tratarIntimacao(event, await serverSupabaseClient(event), id, body, userId)
  await auditar(event, body.reabrir ? 'reabriu intimação' : 'tratou intimação', 'intimacao', id)
  return r
})
