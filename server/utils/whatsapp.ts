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
  midia?: { id: string; mime: string; nome: string | null; legenda: string | null }
}

const ROTULO_MIDIA: Record<string, string> = { audio: 'áudio', image: 'imagem', document: 'documento', video: 'vídeo', sticker: 'figurinha' }

/** Baixa uma mídia recebida (a Meta exige duas chamadas: metadados e depois o arquivo). */
export async function baixarMidia(mediaId: string): Promise<{ buffer: Buffer; mime: string }> {
  const c = useRuntimeConfig()
  const auth = { Authorization: `Bearer ${c.whatsappToken}` }
  const meta = await fetch(`${GRAPH}/${mediaId}`, { headers: auth })
  if (!meta.ok) throw new Error(`Falha ao consultar mídia (${meta.status}).`)
  const info = await meta.json() as { url: string; mime_type: string; file_size?: number }
  if (info.file_size && info.file_size > 20 * 1024 * 1024) throw new Error('Arquivo maior que 20 MB.')
  const arq = await fetch(info.url, { headers: auth })
  if (!arq.ok) throw new Error(`Falha ao baixar mídia (${arq.status}).`)
  return { buffer: Buffer.from(await arq.arrayBuffer()), mime: info.mime_type }
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
        const dadosMidia = ROTULO_MIDIA[tipo] ? m[tipo] : null
        out.push({
          midia: dadosMidia?.id ? { id: dadosMidia.id, mime: dadosMidia.mime_type ?? '', nome: dadosMidia.filename ?? null, legenda: dadosMidia.caption ?? null } : undefined,
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

export interface EcoEnviado {
  waId: string
  telefone: string
  texto: string
  timestamp: number
}

/**
 * Coexistência (WhatsApp Business app + API no mesmo número): o que a advogada envia
 * pelo aplicativo do celular chega como "smb_message_echoes". Assim a conversa no CRM
 * fica completa, sem precisar escolher entre o celular e o sistema.
 */
export function extrairEcos(payload: any): EcoEnviado[] {
  const out: EcoEnviado[] = []
  for (const entry of payload?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      if (change?.field !== 'smb_message_echoes') continue
      for (const m of change?.value?.message_echoes ?? []) {
        const tipo = m.type as string
        const texto = tipo === 'text'
          ? m.text?.body ?? ''
          : `[enviado pelo celular: ${ROTULO_MIDIA[tipo] ?? 'mensagem'}${m[tipo]?.caption ? ` — "${m[tipo].caption}"` : ''}]`
        out.push({ waId: m.id, telefone: String(m.to), texto: texto.slice(0, 4000), timestamp: Number(m.timestamp) * 1000 || Date.now() })
      }
    }
  }
  return out
}
