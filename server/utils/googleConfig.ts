import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ConfigGoogle } from './google'

/** Credenciais do app OAuth do Google (Google Cloud Console). Vazio = recurso desligado. */
export function configGoogle(event: H3Event): (ConfigGoogle & { configurado: boolean }) {
  const c = useRuntimeConfig(event)
  const site = String(c.public.siteUrl || '').replace(/\/$/, '')
  return { clientId: String(c.googleClientId || ''), clientSecret: String(c.googleClientSecret || ''), redirectUri: String(c.googleRedirectUri || `${site}/api/google/callback`), configurado: !!(c.googleClientId && c.googleClientSecret) }
}
