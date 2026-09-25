import { assinaturaValida, extrairEcos, extrairMensagens } from '../../utils/whatsapp'
import { registrarEco } from '../../utils/ecos'
import { processarMensagem } from '../../utils/atendimento'

/**
 * Recebe eventos do WhatsApp Cloud API. Responde 200 imediatamente (a Meta
 * reenvia se demorar) e processa as mensagens em seguida.
 */
export default defineEventHandler(async (event) => {
  const bruto = (await readRawBody(event, 'utf8')) ?? ''
  if (!assinaturaValida(bruto, getHeader(event, 'x-hub-signature-256'))) {
    throw createError({ statusCode: 401, message: 'Assinatura inválida.' })
  }

  let payload: unknown
  try {
    payload = JSON.parse(bruto)
  } catch {
    throw createError({ statusCode: 400, message: 'JSON inválido.' })
  }

  const mensagens = extrairMensagens(payload)
  const ecos = extrairEcos(payload)
  const tarefa = (async () => {
    for (const eco of ecos) {
      try {
        await registrarEco(event, eco)
      } catch (e) {
        console.error('[whatsapp/webhook] Erro ao registrar mensagem do celular:', e)
      }
    }
    for (const m of mensagens) {
      try {
        await processarMensagem(event, m)
      } catch (e) {
        console.error('[whatsapp/webhook] Erro ao processar mensagem:', e)
      }
    }
  })()
  // Mantém o processamento vivo após a resposta, quando o ambiente permite.
  if (typeof event.waitUntil === 'function') event.waitUntil(tarefa)

  return { ok: true }
})
