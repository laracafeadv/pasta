import { assinaturaValida, extrairEcos, extrairMensagens } from '../../utils/whatsapp'
import { registrarEco } from '../../utils/ecos'
import { processarMensagem } from '../../utils/atendimento'
import { serverSupabaseServiceRole } from '#supabase/server'

/** Diagnóstico: guarda só o resultado da última chamada da Meta (sem conteúdo de mensagem). */
async function registrarDiagnostico(event: Parameters<typeof readRawBody>[0], info: Record<string, unknown>) {
  try {
    await serverSupabaseServiceRole(event).from('escritorio').upsert(
      { chave: 'wa_ultimo_webhook', valor: JSON.stringify({ em: new Date().toISOString(), ...info }), updated_at: new Date().toISOString() },
      { onConflict: 'chave' },
    )
  } catch { /* diagnóstico nunca derruba o webhook */ }
}

/**
 * Recebe eventos do WhatsApp Cloud API. Responde 200 imediatamente (a Meta
 * reenvia se demorar) e processa as mensagens em seguida.
 */
export default defineEventHandler(async (event) => {
  const bruto = (await readRawBody(event, 'utf8')) ?? ''
  const temAssinatura = !!getHeader(event, 'x-hub-signature-256')
  if (!assinaturaValida(bruto, getHeader(event, 'x-hub-signature-256'))) {
    await registrarDiagnostico(event, { ok: false, motivo: temAssinatura ? 'assinatura não confere (App Secret diferente)' : 'sem assinatura', tamanho: bruto.length })
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
  const campos = ((payload as any)?.entry ?? []).flatMap((e: any) => (e?.changes ?? []).map((c: any) => c?.field))
  await registrarDiagnostico(event, { ok: true, campos, mensagens: mensagens.length, ecos: ecos.length })
  // 1) Grava tudo ANTES de responder (na Vercel o processo pode parar logo após a resposta).
  const respostasDaAna: (() => Promise<void>)[] = []
  for (const eco of ecos) {
    try {
      await registrarEco(event, eco)
    } catch (e) {
      console.error('[whatsapp/webhook] Erro ao registrar mensagem do celular:', e)
    }
  }
  for (const m of mensagens) {
    try {
      const continuar = await processarMensagem(event, m)
      if (continuar) respostasDaAna.push(continuar)
    } catch (e) {
      console.error('[whatsapp/webhook] Erro ao processar mensagem:', e)
    }
  }
  // 2) A resposta da Ana (espera mensagens seguidas + IA) segue em segundo plano.
  if (respostasDaAna.length) {
    const tarefa = (async () => {
      for (const responder of respostasDaAna) {
        try {
          await responder()
        } catch (e) {
          console.error('[whatsapp/webhook] Erro na resposta da assistente:', e)
        }
      }
    })()
    if (typeof event.waitUntil === 'function') event.waitUntil(tarefa)
  }

  return { ok: true }
})
