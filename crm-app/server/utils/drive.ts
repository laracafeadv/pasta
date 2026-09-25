import { createSign } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ESTRUTURA_PASTA_CLIENTE, codigoCliente, type SubpastaCliente } from '../../shared/types/crm'

/**
 * Google Drive por conta de serviço. Tudo fica dentro de UMA pasta raiz num Drive
 * compartilhado do escritório (GOOGLE_DRIVE_PASTA_CLIENTES); quem acessa é decidido
 * pelos membros desse Drive compartilhado, não por links públicos.
 */
const OAUTH = () => process.env.GOOGLE_OAUTH_URL || 'https://oauth2.googleapis.com/token'
const API = () => process.env.GOOGLE_DRIVE_API_URL || 'https://www.googleapis.com'
const PASTA = 'application/vnd.google-apps.folder'

export function driveConfigurado() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DRIVE_PASTA_CLIENTES)
}

let cache: { token: string; expira: number } | null = null
async function token(): Promise<string> {
  if (cache && cache.expira > Date.now() + 60_000) return cache.token
  const agora = Math.floor(Date.now() / 1000)
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const corpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600,
  })}`
  const chave = String(process.env.GOOGLE_SERVICE_ACCOUNT_KEY).replace(/\\n/g, '\n')
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(chave, 'base64url')
  const r = await $fetch<{ access_token: string; expires_in: number }>(OAUTH(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${assinatura}` }).toString(),
  })
  cache = { token: r.access_token, expira: Date.now() + r.expires_in * 1000 }
  return r.access_token
}

async function criarPasta(nome: string, pai: string) {
  return $fetch<{ id: string; webViewLink: string }>(`${API()}/drive/v3/files`, {
    method: 'POST',
    query: { supportsAllDrives: 'true', fields: 'id,webViewLink' },
    headers: { Authorization: `Bearer ${await token()}` },
    body: { name: nome, mimeType: PASTA, parents: [pai] },
  })
}

/** Envia um arquivo com propriedades de indexação (cliente, tipo, sigilo) buscáveis no Drive. */
export async function enviarArquivo(o: { nome: string; mime: string; conteudo: Buffer; pastaId: string; propriedades: Record<string, string> }) {
  const fronteira = `lara${Date.now()}`
  const meta = JSON.stringify({ name: o.nome, parents: [o.pastaId], appProperties: o.propriedades, description: Object.entries(o.propriedades).map(([k, v]) => `${k}: ${v}`).join(' · ') })
  const corpo = Buffer.concat([
    Buffer.from(`--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${fronteira}\r\nContent-Type: ${o.mime}\r\n\r\n`),
    o.conteudo,
    Buffer.from(`\r\n--${fronteira}--`),
  ])
  return $fetch<{ id: string; webViewLink: string }>(`${API()}/upload/drive/v3/files`, {
    method: 'POST',
    query: { uploadType: 'multipart', supportsAllDrives: 'true', fields: 'id,webViewLink' },
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': `multipart/related; boundary=${fronteira}` },
    body: corpo,
  })
}

/**
 * Garante a pasta do cliente ("CLI-0005 — Juliana Prado") com as subpastas padrão.
 * Idempotente: se já existe, só completa subpastas que faltarem.
 */
export async function garantirPastaCliente(admin: SupabaseClient, contatoId: number) {
  if (!driveConfigurado()) throw createError({ statusCode: 503, message: 'Google Drive não configurado (veja o guia de implantação).' })
  const { data: c } = await admin.from('contatos').select('id, nome, drive_pasta_id, drive_pasta_url, drive_subpastas').eq('id', contatoId).single()
  if (!c) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })

  let pastaId = c.drive_pasta_id as string | null
  let url = c.drive_pasta_url as string | null
  const subpastas: Record<string, string> = { ...(c.drive_subpastas ?? {}) }
  try {
    if (!pastaId) {
      const p = await criarPasta(`${codigoCliente(c.id)} — ${c.nome || 'Sem nome'}`, process.env.GOOGLE_DRIVE_PASTA_CLIENTES!)
      pastaId = p.id
      url = p.webViewLink
    }
    for (const s of ESTRUTURA_PASTA_CLIENTE) {
      if (!subpastas[s.chave]) subpastas[s.chave] = (await criarPasta(s.nome, pastaId)).id
    }
  } catch (e) {
    console.error('[drive] Erro ao criar pastas:', e)
    throw createError({ statusCode: 502, message: 'O Google Drive não respondeu. Confira a conta de serviço e o acesso à pasta raiz.' })
  } finally {
    // Guarda o que já foi criado, mesmo em falha parcial (evita pastas duplicadas).
    if (pastaId) await admin.from('contatos').update({ drive_pasta_id: pastaId, drive_pasta_url: url, drive_subpastas: subpastas }).eq('id', c.id)
  }
  return { pastaId: pastaId!, url: url!, subpastas: subpastas as Record<SubpastaCliente, string> }
}
