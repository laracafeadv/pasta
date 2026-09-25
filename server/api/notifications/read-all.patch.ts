import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { throwSanitizedInternalError } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.sub)
    .eq('is_read', false)

  if (error) {
    throwSanitizedInternalError('notifications/read-all', error, 'Erro interno ao atualizar notificações.')
  }

  return { success: true }
})
