// Lógica pura do WhatsApp Cloud API (sem Deno/Node específicos): testável em Node e usada pelas Edge Functions.
export const GRAPH_VERSAO = 'v25.0'

export function normalizarTelefone(raw: string | null | undefined): string {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  return d
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')

/** X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(corpo bruto, App Secret). Comparação em tempo constante. */
export async function assinaturaValida(corpo: string, cabecalho: string | null | undefined, segredo: string | undefined): Promise<boolean> {
  if (!segredo || !cabecalho || !cabecalho.startsWith('sha256=')) return false
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const esperado = 'sha256=' + hex(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo)))
  if (esperado.length !== cabecalho.length) return false
  let diff = 0
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ cabecalho.charCodeAt(i)
  return diff === 0
}

export interface MsgEntrada { waId: string; telefone: string; nomePerfil: string | null; tipo: string; texto: string; timestamp: number; midia: boolean }
export interface StatusEvento { waId: string; status: 'sent' | 'delivered' | 'read' | 'failed'; timestamp: number; telefone: string; erro: string | null }
export interface Eco { waId: string; telefone: string; texto: string; timestamp: number }

const ROT: Record<string, string> = { audio: 'um áudio', image: 'uma imagem', document: 'um documento', video: 'um vídeo', sticker: 'uma figurinha', location: 'uma localização', contacts: 'um contato' }
const ts = (v: unknown) => Number(v) * 1000 || Date.now()

export function extrairEventos(payload: any): { mensagens: MsgEntrada[]; status: StatusEvento[]; ecos: Eco[] } {
  const mensagens: MsgEntrada[] = [], status: StatusEvento[] = [], ecos: Eco[] = []
  for (const entry of payload?.entry ?? []) for (const change of entry?.changes ?? []) {
    const v = change?.value; if (!v) continue
    if (change.field === 'smb_message_echoes') {
      for (const m of v.message_echoes ?? []) {
        const texto = m.type === 'text' ? (m.text?.body ?? '') : `[enviado pelo celular: ${ROT[m.type] ?? 'mensagem'}${m[m.type]?.caption ? ` — "${m[m.type].caption}"` : ''}]`
        ecos.push({ waId: String(m.id), telefone: String(m.to), texto: texto.slice(0, 4000), timestamp: ts(m.timestamp) })
      }
      continue
    }
    const nomes = new Map<string, string>((v.contacts ?? []).map((c: any) => [String(c.wa_id), c.profile?.name]))
    for (const m of v.messages ?? []) {
      const tipo = String(m.type)
      let texto = ''
      if (tipo === 'text') texto = m.text?.body ?? ''
      else if (tipo === 'button') texto = m.button?.text ?? ''
      else if (tipo === 'interactive') texto = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? ''
      else texto = `[o cliente enviou ${ROT[tipo] ?? 'uma mensagem'}${m[tipo]?.caption ? ` — "${m[tipo].caption}"` : ''}]`
      mensagens.push({ waId: String(m.id), telefone: String(m.from), nomePerfil: nomes.get(String(m.from)) ?? null, tipo, texto: texto.slice(0, 4000), timestamp: ts(m.timestamp), midia: !!ROT[tipo] && tipo !== 'location' && tipo !== 'contacts' })
    }
    for (const s of v.statuses ?? []) {
      if (!['sent', 'delivered', 'read', 'failed'].includes(s.status)) continue
      const e = s.errors?.[0]
      status.push({ waId: String(s.id), status: s.status, timestamp: ts(s.timestamp), telefone: String(s.recipient_id ?? ''), erro: e ? mensagemDeErro(Number(e.code), e.title || e.message) : null })
    }
  }
  return { mensagens, status, ecos }
}

/** Mensagens claras em português para os erros mais comuns da Meta. */
export function mensagemDeErro(codigo: number | undefined, detalhe?: string): string {
  const mapa: Record<number, string> = {
    131047: 'Passaram mais de 24h desde a última mensagem da cliente: o WhatsApp só aceita um modelo (template) aprovado.',
    131026: 'Mensagem não entregue: o número não tem WhatsApp ou não pode receber.',
    131030: 'Número fora da lista de destinatários de teste da Meta (no número de teste, cadastre o destinatário).',
    131051: 'Tipo de mensagem não suportado.',
    132000: 'Os parâmetros do modelo não conferem com o modelo aprovado.',
    132001: 'Modelo inexistente ou não aprovado nesse idioma.',
    190: 'O token de acesso da Meta expirou ou é inválido. Gere um novo token permanente e atualize o segredo WHATSAPP_TOKEN.',
    100: 'Requisição recusada pela Meta (parâmetro inválido).',
  }
  return mapa[codigo ?? 0] ?? `Falha ao enviar pelo WhatsApp (${codigo ?? 'sem código'})${detalhe ? ': ' + String(detalhe).slice(0, 160) : ''}.`
}

export interface Saida { tipo: string; telefone: string; texto?: string | null; template_nome?: string | null; template_idioma?: string | null; template_params?: string[] | null }

/** Corpo do POST /{phone-number-id}/messages. */
export function corpoDeEnvio(s: Saida): Record<string, unknown> {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: normalizarTelefone(s.telefone) }
  if (s.tipo === 'template') {
    if (!s.template_nome || !s.template_idioma) throw new Error('Modelo sem nome ou idioma.')
    const params = (s.template_params ?? []).map(p => ({ type: 'text', text: String(p).slice(0, 1024) }))
    return { ...base, type: 'template', template: { name: s.template_nome, language: { code: s.template_idioma }, ...(params.length ? { components: [{ type: 'body', parameters: params }] } : {}) } }
  }
  const t = String(s.texto ?? '').trim()
  if (!t) throw new Error('Mensagem vazia.')
  return { ...base, type: 'text', text: { preview_url: false, body: t.slice(0, 4096) } }
}

/** Mapa de status da Meta → status do CRM, sem nunca "regredir" (lida > entregue > enviada). */
const ORDEM: Record<string, number> = { recebida: 0, enviada: 1, entregue: 2, lida: 3, falhou: 9 }
export const statusCrm = (s: StatusEvento['status']) => ({ sent: 'enviada', delivered: 'entregue', read: 'lida', failed: 'falhou' } as const)[s]
export const avanca = (atual: string | null | undefined, novo: string) => (ORDEM[novo] ?? 0) > (ORDEM[atual ?? 'recebida'] ?? 0)
