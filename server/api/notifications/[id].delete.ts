import { defineEventHandler, createError, getRouterParam } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { throwSanitizedInternalError } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Notification id is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.sub)

  if (error) {
    throwSanitizedInternalError('notifications/delete', error, 'Erro interno ao excluir notificação.')
  }

  return { success: true }
})
