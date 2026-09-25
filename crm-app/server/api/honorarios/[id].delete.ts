import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'honorarios/delete')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const { error } = await client.from('honorarios').delete().eq('id', id)
  if (error) {
    console.error('[honorarios] Erro ao excluir:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao excluir honorário.' })
  }
  return { success: true }
})
