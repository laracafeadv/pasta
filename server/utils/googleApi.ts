import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { configGoogle } from './googleConfig'
import { criarApiGoogle, lerConexao, tokenDeAcesso, type Api } from './google'

/** API do Google já autenticada para a usuária. Erros: 503 (app do Google não configurado) e 409 (conta não conectada ou conexão vencida). */
export async function apiGoogleDoUsuario(event: H3Event, userId: string): Promise<{ api: Api; admin: any }> {
  const cfg = configGoogle(event)
  if (!cfg.configurado) throw createError({ statusCode: 503, message: 'A conexão com o Google ainda não foi configurada no servidor.', data: { configurar: true } })
  const admin = serverSupabaseServiceRole(event)
  const token = await tokenDeAcesso(admin, cfg, userId)
  const c = await lerConexao(admin, userId)
  return { api: criarApiGoogle(token, c?.email ?? null), admin }
}
