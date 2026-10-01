import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { throwSanitizedInternalError } from '../../utils/security'

const PROFILE_SELECT = 'id, email, name, role, phone, company, avatar_url, created_at'

// Atualiza o próprio perfil. Apenas campos pessoais: o nível de acesso (role)
// só pode ser alterado por um admin em /api/admin/users.
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })

  const body = await readBody<{ name?: string; phone?: string | null; company?: string | null }>(event)
  const updates: Record<string, string | null> = {}

  if (body?.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw createError({ statusCode: 400, message: 'Nome inválido.' })
    updates.name = body.name.trim().slice(0, 120)
  }
  if (body?.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim().slice(0, 30) : null
  if (body?.company !== undefined) updates.company = body.company ? String(body.company).trim().slice(0, 120) : null

  const { data, error } = await serverSupabaseServiceRole(event)
    .from('profiles')
    .update(updates)
    .eq('id', user.sub)
    .select(PROFILE_SELECT)
    .single()

  if (error) throwSanitizedInternalError('profile/update', error, 'Erro interno ao atualizar perfil.')
  return data
})
