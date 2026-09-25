import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * WhatsApp Cloud API (oficial da Meta). Usa a API oficial em vez de soluções
 * não oficiais (que emulam o WhatsApp Web) para não arriscar o bloqueio do número
 * do escritório e para cumprir os termos da Meta.
 */
// WHATSAPP_GRAPH_URL só existe para testes locais; em produção fica o endereço oficial.
const GRAPH = process.env.WHATSAPP_GRAPH_URL || 'https://graph.facebook.com/v21.0'

export function whatsappConfigurado() {
  const c = useRuntimeConfig()
  return Boolean(c.whatsappToken && c.whatsappPhoneNumberId)
}

/** Envia uma mensagem de texto. Retorna o id da mensagem na Meta. */
export async function enviarTexto(telefone: string, texto: string): Promise<string | null> {
  const c = useRuntimeConfig()
  if (!whatsappConfigurado()) throw new Error('WhatsApp não configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID).')

  const res = await fetch(`${GRAPH}/${c.whatsappPhoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.whatsappToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: telefone,
      type: 'text',
      text: { preview_url: false, body: texto.slice(0, 4096) },
    }),
  })

  const data = await res.json().catch(() => ({})) as { messages?: { id: string }[]; error?: { code?: number; message?: string } }
  if (!res.ok) {
    // 131047: fora da janela de 24h (só modelos aprovados podem ser enviados)
    const codigo = data.error?.code
    const erro = new Error(codigo === 131047
      ? 'Passaram mais de 24h desde a última mensagem do cliente. O WhatsApp só permite modelos aprovados nesse caso.'
      : `Falha ao enviar pelo WhatsApp (${codigo ?? res.status}).`) as Error & { codigo?: number }
    erro.codigo = codigo
    console.error('[whatsapp] Erro ao enviar:', res.status, data.error)
    throw erro
  }
  return data.messages?.[0]?.id ?? null
}

/** Confere o cabeçalho X-Hub-Signature-256 (HMAC-SHA256 do corpo com o App Secret). */
export function assinaturaValida(corpoBruto: string, assinatura: string | undefined): boolean {
  const segredo = useRuntimeConfig().whatsappAppSecret as string
  if (!segredo) {
    // Sem App Secret configurado não há como validar: recusa em produção.
    return process.env.NODE_ENV !== 'production'
  }
  if (!assinatura?.startsWith('sha256=')) return false
  const esperado = Buffer.from('sha256=' + createHmac('sha256', segredo).update(corpoBruto, 'utf8').digest('hex'))
  const recebido = Buffer.from(assinatura)
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido)
}

export interface MensagemRecebida {
  waId: string
  telefone: string
  nomePerfil: string | null
  tipo: string
  texto: string
  timestamp: number
}

/** Extrai as mensagens de um payload de webhook da Meta. */
export function extrairMensagens(payload: any): MensagemRecebida[] {
  const out: MensagemRecebida[] = []
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value
      if (!value?.messages) continue
      const nomes = new Map<string, string>((value.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name]))
      for (const m of value.messages) {
        const tipo = m.type as string
        let texto = ''
        if (tipo === 'text') texto = m.text?.body ?? ''
        else if (tipo === 'button') texto = m.button?.text ?? ''
        else if (tipo === 'interactive') texto = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? ''
        else texto = `[o cliente enviou ${({ audio: 'um áudio', image: 'uma imagem', document: 'um documento', video: 'um vídeo', sticker: 'uma figurinha', location: 'uma localização' } as Record<string, string>)[tipo] ?? 'uma mensagem que não é texto'}]`
        out.push({
          waId: m.id,
          telefone: String(m.from),
          nomePerfil: nomes.get(m.from) ?? null,
          tipo,
          texto: texto.slice(0, 4000),
          timestamp: Number(m.timestamp) * 1000 || Date.now(),
        })
      }
    }
  }
  return out
}
