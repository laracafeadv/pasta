import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { assertActorRole } from '../../utils/security'

export default defineEventHandler(async (event) => {
  // 1. Authenticate user
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  await assertActorRole(event, user.sub, ['admin'], 'Apenas administradores podem enviar emails.', 'email/send')

  // 2. Read request body
  const body = await readBody(event)
  const { to, subject, html, text } = body

  if (!to || !subject || (!html && !text)) {
    throw createError({ statusCode: 400, message: 'Faltam campos obrigatórios: to, subject, html/text.' })
  }

  // Validate email format(s)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients = Array.isArray(to) ? to : [to]
  for (const addr of recipients) {
    if (typeof addr !== 'string' || !emailRegex.test(addr)) {
      throw createError({ statusCode: 400, message: `Endereço de email inválido: ${addr}` })
    }
  }

  // Configuration
  const config = useRuntimeConfig()
  const resendApiKey = config.resendApiKey
  const senderEmail = config.mailerSenderEmail

  if (!resendApiKey || !senderEmail) {
    throw createError({ statusCode: 500, message: 'Configuração de envio de email ausente no servidor.' })
  }

  // 3. Send email to Resend API
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: senderEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[email/send] Erro na API Resend:', response.status, errorData)
      throw createError({ statusCode: 502, message: 'Erro ao enviar email. Tente novamente.' })
    }

    const resendData = await response.json()
    return { success: true, data: resendData }

  } catch (err: any) {
    console.error('[email/send] Erro ao enviar email:', err)
    // Re-throw H3 errors (ex: 400 de validação) sem alteração; sanitiza os demais
    if (err.statusCode && err.statusCode < 500) throw err
    throw createError({ statusCode: 500, message: 'Erro interno ao enviar o email.' })
  }
})
