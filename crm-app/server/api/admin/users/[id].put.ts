import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { assertActorRole } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

const PROFILE_SELECT = 'id, email, name, role, phone, company, avatar_url, created_at'

export default defineEventHandler(async (event) => {
  // 1. Params and auth
  const userIdToUpdate = event.context.params?.id
  if (!userIdToUpdate) {
    throw createError({ statusCode: 400, message: 'ID do usuário não fornecido na URL.' })
  }

  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autenticado' })

  const supabaseAdmin = serverSupabaseServiceRole(event)
  await assertActorRole(event, user.sub, ['admin'], 'Somente administradores.', 'admin/users/update')

  // 2. Read body
  const body = await readBody(event)
  const { role, company, phone, name } = body ?? {}

  if (role !== undefined && !['admin', 'equipe', 'user'].includes(role)) {
    throw createError({ statusCode: 400, message: 'Nível de acesso inválido.' })
  }

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    throw createError({ statusCode: 400, message: 'Nome inválido.' })
  }

  // We do not allow changing email through this endpoint for now as it disrupts Auth.
  
  const updates: any = { updated_at: new Date().toISOString() }
  if (role !== undefined) updates.role = role
  if (company !== undefined) updates.company = company
  if (phone !== undefined) updates.phone = phone
  if (name !== undefined) updates.name = name

  const { data: updatedProfile, error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userIdToUpdate)
    .select(PROFILE_SELECT)
    .single()

  if (updateError) {
    console.error('[admin/users] Erro ao atualizar usuário:', updateError)
    throw createError({ statusCode: 500, message: 'Erro interno ao atualizar usuário.' })
  }

  // Optionally update auth user_metadata if name changed
  if (name) {
    await supabaseAdmin.auth.admin.updateUserById(userIdToUpdate, {
      user_metadata: { name }
    })
  }

  await auditar(event, 'alterou usuário', 'usuario', userIdToUpdate, { campos: Object.keys(updates).filter(k => k !== 'updated_at') })
  return { success: true, user: updatedProfile }
})
