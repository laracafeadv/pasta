import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'

/**
 * Avisa a equipe por e-mail (Resend). Sem chave configurada, não faz nada — como o
 * WhatsApp sem token: a funcionalidade central segue funcionando, só o aviso não sai.
 */
export async function enviarEmailEquipe(event: H3Event, subject: string, html: string) {
  const config = useRuntimeConfig()
  const apiKey = config.resendApiKey as string
  const sender = config.mailerSenderEmail as string
  if (!apiKey || !sender) return

  const admin = serverSupabaseServiceRole(event)
  const { data: staff } = await admin.from('profiles').select('email').in('role', ['admin', 'equipe'])
  const destinatarios = (staff ?? []).map(s => s.email).filter(Boolean)
  if (!destinatarios.length) return

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: sender, to: destinatarios, subject, html }),
    })
    if (!r.ok) console.error('[email] Resend recusou:', r.status, await r.text().catch(() => ''))
  } catch (e) {
    console.error('[email] Erro ao enviar:', e)
  }
}
