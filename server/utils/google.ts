import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { MensagemSimples } from '../../shared/utils/avisosTribunal'

/**
 * Conexão com a conta Google da usuária (OAuth 2.0): Gmail somente leitura e Google Agenda (criar eventos).
 * Os tokens ficam cifrados (AES-256-GCM) na tabela google_conexoes, que só o servidor lê.
 * Sem GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET configurados, nada disso funciona: a tela avisa e oferece o passo a passo.
 */
export interface ConfigGoogle { clientId: string; clientSecret: string; redirectUri: string }
export const ESCOPOS = ['openid', 'email', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events']
const erro = (statusCode: number, message: string, data?: unknown) => createError({ statusCode, message, data })
const b64u = (b: Buffer) => b.toString('base64url')

// ── cifra dos tokens e estado do OAuth ──
const chave = (segredo: string) => createHash('sha256').update('crm-google-tokens:' + segredo).digest()
export function cifrar(texto: string, segredo: string): string {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', chave(segredo), iv)
  const enc = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64')
}
export function decifrar(valor: string, segredo: string): string {
  const b = Buffer.from(valor, 'base64')
  const d = createDecipheriv('aes-256-gcm', chave(segredo), b.subarray(0, 12))
  d.setAuthTag(b.subarray(12, 28))
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')
}
/** "state" do OAuth: amarra a volta do Google à usuária que iniciou e expira em 10 minutos. */
export function assinarEstado(userId: string, segredo: string, agora = Date.now()): string {
  const corpo = `${userId}.${agora}.${b64u(randomBytes(8))}`
  return `${corpo}.${createHmac('sha256', segredo).update(corpo).digest('base64url')}`
}
export function verificarEstado(estado: string, segredo: string, agora = Date.now()): string | null {
  const p = String(estado ?? '').split('.')
  if (p.length !== 4) return null
  const corpo = p.slice(0, 3).join('.'), esperado = createHmac('sha256', segredo).update(corpo).digest()
  const recebido = Buffer.from(p[3]!, 'base64url')
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) return null
  const t = Number(p[1])
  if (!Number.isFinite(t) || agora - t > 10 * 60_000 || agora < t - 60_000) return null
  return p[0]!
}
export function urlAutorizacao(cfg: ConfigGoogle, estado: string): string {
  const q = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirectUri, response_type: 'code', scope: ESCOPOS.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: estado })
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q.toString()
}

// ── chamadas ao Google ──
export interface Tokens { access_token: string; expires_in: number; refresh_token?: string; scope?: string }
async function postForm(url: string, corpo: Record<string, string>): Promise<any> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(corpo).toString() })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) throw erro(r.status === 400 || r.status === 401 ? 401 : 502, j?.error === 'invalid_grant' ? 'A conexão com o Google expirou. Conecte de novo.' : 'O Google recusou o pedido.', { google: j?.error })
  return j
}
export const trocarCodigo = (cfg: ConfigGoogle, code: string): Promise<Tokens> => postForm('https://oauth2.googleapis.com/token', { code, client_id: cfg.clientId, client_secret: cfg.clientSecret, redirect_uri: cfg.redirectUri, grant_type: 'authorization_code' })
export const renovarToken = (cfg: ConfigGoogle, refresh: string): Promise<Tokens> => postForm('https://oauth2.googleapis.com/token', { refresh_token: refresh, client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: 'refresh_token' })
export async function revogar(token: string) { try { await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'token=' + encodeURIComponent(token) }) } catch { /* melhor esforço */ } }

async function api(token: string, url: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(url, { ...init, headers: { authorization: 'Bearer ' + token, ...(init.body ? { 'content-type': 'application/json' } : {}), ...(init.headers ?? {}) } })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) {
    const m = j?.error?.message ?? ''
    if (r.status === 401) throw erro(401, 'A conexão com o Google expirou. Conecte de novo.')
    if (r.status === 403) throw erro(403, /insufficient|scope/i.test(m) ? 'Faltou uma permissão do Google (Gmail ou Agenda). Conecte de novo e marque todas.' : 'O Google negou o acesso: ' + (m || 'sem detalhe'))
    throw erro(502, 'Erro ao falar com o Google (' + r.status + ').')
  }
  return j
}

// ── armazenamento da conexão (chave de serviço) ──
export async function salvarConexao(admin: any, userId: string, t: Tokens, email: string | null, segredo: string) {
  const { data: atual } = await admin.from('google_conexoes').select('refresh_token_enc').eq('user_id', userId).maybeSingle()
  const refresh = t.refresh_token ? cifrar(t.refresh_token, segredo) : atual?.refresh_token_enc
  if (!refresh) throw erro(400, 'O Google não devolveu a permissão de acesso contínuo. Conecte de novo e aceite tudo.')
  const row = { user_id: userId, email, escopos: t.scope ?? ESCOPOS.join(' '), refresh_token_enc: refresh, access_token_enc: cifrar(t.access_token, segredo), expira_em: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString() }
  const { error } = await admin.from('google_conexoes').upsert(row, { onConflict: 'user_id' })
  if (error) throw erro(500, 'Não foi possível guardar a conexão.')
}
export async function lerConexao(admin: any, userId: string): Promise<{ email: string | null; escopos: string | null } | null> {
  const { data } = await admin.from('google_conexoes').select('email, escopos').eq('user_id', userId).maybeSingle()
  return data ?? null
}
export async function removerConexao(admin: any, userId: string, cfg?: ConfigGoogle) {
  if (cfg) {
    const { data } = await admin.from('google_conexoes').select('refresh_token_enc').eq('user_id', userId).maybeSingle()
    if (data?.refresh_token_enc) { try { await revogar(decifrar(data.refresh_token_enc, cfg.clientSecret)) } catch { /* ignora */ } }
  }
  await admin.from('google_conexoes').delete().eq('user_id', userId)
  await admin.from('google_avisos_cache').delete().eq('user_id', userId)
}
/** Token de acesso válido: usa o guardado, ou renova com o refresh token quando perto de vencer. */
export async function tokenDeAcesso(admin: any, cfg: ConfigGoogle, userId: string): Promise<string> {
  const { data: c } = await admin.from('google_conexoes').select('refresh_token_enc, access_token_enc, expira_em').eq('user_id', userId).maybeSingle()
  if (!c) throw erro(409, 'Conecte a sua conta Google para usar o Gmail e a Agenda.', { conectar: true })
  if (c.access_token_enc && c.expira_em && new Date(c.expira_em).getTime() - Date.now() > 60_000) { try { return decifrar(c.access_token_enc, cfg.clientSecret) } catch { /* cai para renovar */ } }
  let t: Tokens
  try { t = await renovarToken(cfg, decifrar(c.refresh_token_enc, cfg.clientSecret)) } catch (e: any) {
    if (e?.statusCode === 401) { await admin.from('google_conexoes').delete().eq('user_id', userId); throw erro(409, 'A conexão com o Google expirou. Conecte de novo.', { conectar: true }) }
    throw e
  }
  await admin.from('google_conexoes').update({ access_token_enc: cifrar(t.access_token, cfg.clientSecret), expira_em: new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString() }).eq('user_id', userId)
  return t.access_token
}
export async function emailDaConta(accessToken: string): Promise<string | null> {
  try { return (await api(accessToken, 'https://openidconnect.googleapis.com/v1/userinfo')).email ?? null } catch { return null }
}

// ── Gmail ──
export interface ThreadResumo { id: string; historyId: string; snippet: string }
export interface Api {
  listarThreads(q: string, max: number): Promise<ThreadResumo[]>
  threadMeta(id: string): Promise<(MensagemSimples & { id?: string })[]>
  threadCompleto(id: string): Promise<(MensagemSimples & { plaintextBody: string })[]>
  criarEvento(e: { titulo: string; dia: string; descricao: string; avisos: number[] }): Promise<{ id: string; link: string }>
  /** Eventos da agenda principal com o texto `q` (nome do lead) entre duas datas (AAAA-MM-DD). */
  buscarEventos(q: string, de: string, ate: string): Promise<EventoAgenda[]>
  /** Consulta com dia e hora (horário da Bahia), lembretes e, se on-line, link do Google Meet. */
  criarConsulta(e: { titulo: string; dia: string; hora: string; duracaoMin: number; online: boolean; local: string; descricao: string; avisos: number[] }): Promise<{ id: string; link: string; meet: string }>
}
export interface EventoAgenda { dia: string; hora: string; link: string; titulo: string; descricao: string }
const decodifica = (d?: string) => d ? Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8') : ''
const cabecalho = (m: any, n: string): string => (m?.payload?.headers ?? []).find((h: any) => String(h.name).toLowerCase() === n)?.value ?? ''
export const emailDe = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase()
function htmlParaTexto(h: string) {
  return h.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, ' ').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/\s*(tr|p|div|li|h\d)\s*>/gi, '\n').replace(/<\/\s*t[dh]\s*>/gi, ' ').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n')
}
function corpoDe(payload: any): string {
  const plano: string[] = [], html: string[] = []
  const anda = (p: any) => { if (!p) return; if (p.mimeType === 'text/plain' && p.body?.data) plano.push(decodifica(p.body.data)); else if (p.mimeType === 'text/html' && p.body?.data) html.push(decodifica(p.body.data)); for (const f of p.parts ?? []) anda(f) }
  anda(payload)
  return plano.length ? plano.join('\n') : html.map(htmlParaTexto).join('\n')
}
export function mensagemSimples(m: any, threadId: string, conta: string | null, comCorpo = false): MensagemSimples & { plaintextBody?: string } {
  const out: MensagemSimples & { plaintextBody?: string } = {
    sender: emailDe(cabecalho(m, 'from')), subject: cabecalho(m, 'subject'), snippet: m.snippet ?? '',
    date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : '', labelIds: m.labelIds ?? [],
    viewUrl: `https://mail.google.com/mail/${conta ? '?authuser=' + encodeURIComponent(conta) : 'u/0/'}#all/${threadId}`,
  }
  if (comCorpo) out.plaintextBody = corpoDe(m.payload)
  return out
}
export function criarApiGoogle(token: string, conta: string | null): Api {
  const g = 'https://gmail.googleapis.com/gmail/v1/users/me/threads'
  return {
    async listarThreads(q, max) {
      const out: ThreadResumo[] = []; let pageToken = ''
      for (let i = 0; i < 4 && out.length < max; i++) {
        const u = new URL(g); u.searchParams.set('q', q); u.searchParams.set('maxResults', String(Math.min(100, max - out.length))); if (pageToken) u.searchParams.set('pageToken', pageToken)
        const j = await api(token, u.toString())
        for (const t of j.threads ?? []) out.push({ id: t.id, historyId: String(t.historyId ?? ''), snippet: t.snippet ?? '' })
        pageToken = j.nextPageToken ?? ''; if (!pageToken) break
      }
      return out
    },
    async threadMeta(id) {
      const u = new URL(`${g}/${encodeURIComponent(id)}`); u.searchParams.set('format', 'metadata'); for (const h of ['From', 'Subject', 'Date']) u.searchParams.append('metadataHeaders', h)
      const j = await api(token, u.toString())
      return (j.messages ?? []).map((m: any) => mensagemSimples(m, id, conta))
    },
    async threadCompleto(id) {
      const j = await api(token, `${g}/${encodeURIComponent(id)}?format=full`)
      return (j.messages ?? []).map((m: any) => mensagemSimples(m, id, conta, true) as any)
    },
    async buscarEventos(q, de, ate) {
      const u = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      u.searchParams.set('q', q); u.searchParams.set('timeMin', `${de}T00:00:00-03:00`); u.searchParams.set('timeMax', `${ate}T00:00:00-03:00`)
      u.searchParams.set('singleEvents', 'true'); u.searchParams.set('orderBy', 'startTime'); u.searchParams.set('maxResults', '20')
      const j = await api(token, u.toString())
      const dia = (iso: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia' }).format(new Date(iso))
      const hora = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
      return ((j.items ?? []) as any[]).filter(e => e.status !== 'cancelled').map(e => {
        const st = e.start ?? {}
        return { dia: st.date ?? (st.dateTime ? dia(st.dateTime) : ''), hora: st.dateTime ? hora(st.dateTime) : '', link: e.htmlLink ?? '', titulo: e.summary ?? '', descricao: e.description ?? '' }
      }).filter(e => e.dia)
    },
    async criarConsulta({ titulo, dia, hora, duracaoMin, online, local, descricao, avisos }) {
      const ini = `${dia}T${hora}:00-03:00`
      const fim = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(Date.parse(ini) + duracaoMin * 60000)).replace(' ', 'T') + '-03:00'
      const corpo: Record<string, unknown> = { summary: titulo, description: descricao, location: local, colorId: '5', start: { dateTime: ini, timeZone: 'America/Bahia' }, end: { dateTime: fim, timeZone: 'America/Bahia' }, reminders: { useDefault: false, overrides: avisos.map(minutes => ({ method: 'popup', minutes })) } }
      if (online) corpo.conferenceData = { createRequest: { requestId: randomBytes(8).toString('hex'), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
      const j = await api(token, 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=' + (online ? '1' : '0'), { method: 'POST', body: JSON.stringify(corpo) })
      return { id: j.id ?? '', link: j.htmlLink ?? '', meet: j.hangoutLink ?? '' }
    },
    async criarEvento({ titulo, dia, descricao, avisos }) {
      const prox = new Date(Date.parse(dia + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10)
      const j = await api(token, 'https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', body: JSON.stringify({
        summary: titulo, description: descricao, start: { date: dia }, end: { date: prox }, colorId: '11',
        reminders: { useDefault: false, overrides: avisos.map(minutes => ({ method: 'popup', minutes })) },
      }) })
      return { id: j.id ?? '', link: j.htmlLink ?? '' }
    },
  }
}
