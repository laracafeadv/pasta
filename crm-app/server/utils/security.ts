import { createError, type H3Event } from 'h3'
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

type ProfileRole = 'admin' | 'equipe' | 'user'

export async function getActorRole(event: H3Event, userId: string, context = 'authz'): Promise<ProfileRole | null> {
  const supabaseAdmin = serverSupabaseServiceRole(event)

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    console.error(`[${context}] Erro ao buscar role do usuário:`, error)
    throw createError({ statusCode: 500, message: 'Erro interno ao validar permissões.' })
  }

  return (data?.role as ProfileRole | null) ?? null
}

export async function assertActorRole(
  event: H3Event,
  userId: string,
  allowedRoles: ProfileRole[],
  forbiddenMessage: string,
  context = 'authz'
): Promise<ProfileRole> {
  const role = await getActorRole(event, userId, context)

  if (!role || !allowedRoles.includes(role)) {
    throw createError({ statusCode: 403, message: forbiddenMessage })
  }

  return role
}

export function throwSanitizedInternalError(context: string, error: unknown, message: string, statusCode = 500): never {
  console.error(`[${context}]`, error)
  throw createError({ statusCode, message })
}

export function normalizeEvaAgentName(rawAgentName: unknown, fallback = 'master'): string {
  const agentName = typeof rawAgentName === 'string' ? rawAgentName.trim() : fallback

  if (!agentName) {
    return fallback
  }

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(agentName)) {
    throw createError({ statusCode: 400, message: 'Nome de agente inválido.' })
  }

  return agentName
}

/**
 * Garante que a requisição vem de alguém do escritório (admin ou equipe).
 * Use em toda rota que lê ou altera dados de clientes.
 */
export async function requireStaff(event: H3Event, context = 'staff'): Promise<{ userId: string; role: ProfileRole }> {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
  const role = await assertActorRole(event, user.sub, ['admin', 'equipe'], 'Acesso restrito à equipe do escritório.', context)
  return { userId: user.sub, role }
}

export async function requireAdmin(event: H3Event, context = 'admin'): Promise<{ userId: string }> {
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autorizado.' })
  await assertActorRole(event, user.sub, ['admin'], 'Acesso restrito à administração do escritório.', context)
  return { userId: user.sub }
}
