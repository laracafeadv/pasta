import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'

/** Conclui ou reabre o lembrete. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lembrete-editar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<{ feito?: boolean }>(event)) ?? {}
  const feito = !!b.feito
  const { error } = await (await serverSupabaseClient(event)).from('lembretes_rapidos').update({ feito, feito_em: feito ? new Date().toISOString() : null }).eq('id', id).eq('user_id', userId)
  if (error) throw createError({ statusCode: 500, message: 'Não foi possível salvar.' })
  return { success: true }
})
