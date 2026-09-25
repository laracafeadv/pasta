import { defineEventHandler, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { Profile } from '../../../../shared/types/profile'
import { assertActorRole } from '../../../utils/security'

const PROFILE_SELECT = 'id, email, name, role, phone, company, avatar_url, created_at'

export default defineEventHandler(async (event) => {
  // 1. Verify Authentication and Admin Role
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, message: 'Não autorizado.' })
  }

  const supabaseClient = serverSupabaseServiceRole(event)
  await assertActorRole(event, user.sub, ['admin'], 'Acesso negado. Apenas administradores.', 'admin/users/list')

  // 2. Fetch all profiles
  const { data: users, error } = await supabaseClient
    .from('profiles')
    .select(PROFILE_SELECT)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/users] Erro ao buscar usuários:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao buscar usuários.' })
  }

  return users as Profile[]
})
