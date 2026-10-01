import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'

/** Conclui ou reabre um item da agenda da Secretária. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'secretaria/item-editar')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const feito = !!((await readBody<{ feito?: boolean }>(event)) ?? {}).feito
  const { error } = await (await serverSupabaseClient(event)).from('secretaria_itens').update({ feito, feito_em: feito ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Não foi possível salvar.' })
  return { success: true }
})
