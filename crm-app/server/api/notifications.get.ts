import { defineEventHandler } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { NotificationDTO } from '../../shared/types/NotificationDTO'
import { throwSanitizedInternalError } from '../utils/security'

const NOTIFICATION_SELECT = 'id, user_id, title, message, type, is_read, metadata, created_at'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const client = serverSupabaseServiceRole(event)
  
  const { data, error } = await client
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false })

  if (error) {
    throwSanitizedInternalError('notifications/list', error, 'Erro interno ao buscar notificações.')
  }

  return data as NotificationDTO[]
})
