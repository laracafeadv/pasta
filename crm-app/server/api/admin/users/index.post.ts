import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { randomBytes } from 'node:crypto'
import { useRuntimeConfig } from '#imports'
import { assertActorRole } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  const escapeHtml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  // 1. Verify authorization
  const user = await serverSupabaseUser(event)
  if (!user?.sub) throw createError({ statusCode: 401, message: 'Não autenticado' })

  const supabaseAdmin = serverSupabaseServiceRole(event)
  await assertActorRole(event, user.sub, ['admin'], 'Somente administradores.', 'admin/users/create')

  // 2. Parse body
  const body = await readBody(event)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const role = body.role
  const company = typeof body.company === 'string' ? body.company.trim() : body.company
  const phone = typeof body.phone === 'string' ? body.phone.trim() : body.phone

  if (!email || !name || !role) {
    throw createError({ statusCode: 400, message: 'Dados incompletos: Nome, Email e Nível de Acesso são obrigatórios.' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, message: 'Email inválido.' })
  }

  if (!['admin', 'equipe', 'user'].includes(role)) {
    throw createError({ statusCode: 400, message: 'Nível de acesso inválido.' })
  }

  // 3. Generate a cryptographically secure provisional password
  const generatePassword = (length = 16) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    const bytes = randomBytes(length)
    let res = ''
    for (let i = 0; i < length; i++) {
      const randomByte = bytes[i]
      if (randomByte === undefined) continue
      res += charset.charAt(randomByte % charset.length)
    }
    return res
  }

  const defaultPassword = generatePassword()

  // 4. Create the user with the provisional password
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: { name }
  })

  if (authError || !authData.user) {
    console.error('[admin/users] Erro ao criar usuário:', authError)
    throw createError({ statusCode: 400, message: 'Não foi possível criar o usuário. Verifique se o e-mail já está cadastrado.' })
  }

  const userId = authData.user.id

  // 5. Update or Insert the Profile Record
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email,
      name,
      role,
      company: company || null,
      phone: phone || null,
      updated_at: new Date().toISOString()
    })
    .select('id, email, name, role, phone, company, avatar_url, created_at')
    .single()

  if (profileError) {
    console.error('[admin/users] Erro ao criar perfil:', profileError)
    throw createError({ statusCode: 500, message: 'Usuário criado, mas erro ao configurar perfil.' })
  }

  // 6. Send invite email via Resend — password is sent ONLY via email, never in API response
  const config = useRuntimeConfig()
  const resendApiKey = config.resendApiKey
  const senderEmail = config.mailerSenderEmail
  const appUrl = config.public.siteUrl || 'http://localhost:3000'
  const safeName = escapeHtml(String(name))
  const safeEmail = escapeHtml(String(email))
  const safePassword = escapeHtml(defaultPassword)
  let emailSent = false

  if (resendApiKey && senderEmail) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: senderEmail,
          to: [email],
          subject: 'Seu acesso ao CRM da Lara Café Advocacia',
          html: `
<div style="background:#edeae2;padding:28px 12px;">
  <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;color:#2c2c2c;">
    <div style="background:#3c2923;padding:28px 24px;text-align:center;">
      <p style="color:#edeae2;font-family:Georgia,serif;font-size:26px;letter-spacing:4px;margin:0;">LARA CAFÉ</p>
      <p style="color:#cbc3b4;margin:6px 0 0 0;font-size:11px;letter-spacing:3px;">ADVOCACIA &amp; CONSULTORIA</p>
    </div>
    <div style="padding:30px 26px;">
      <p style="font-size:18px;margin:0 0 12px 0;">Olá, ${safeName}!</p>
      <p style="font-size:15px;line-height:1.7;margin:0 0 18px 0;color:#4d4038;">
        Seu usuário no CRM do escritório foi criado. Estas são as credenciais iniciais:
      </p>
      <div style="background:#f7f5f0;border:1px solid #e0dbd0;border-radius:14px;padding:18px;margin:20px 0;">
        <p style="margin:0 0 4px 0;font-size:12px;color:#857866;">E-mail</p>
        <p style="margin:0 0 14px 0;font-size:15px;font-weight:700;">${safeEmail}</p>
        <p style="margin:0 0 4px 0;font-size:12px;color:#857866;">Senha provisória</p>
        <p style="margin:0;font-size:16px;font-weight:700;font-family:Consolas,Menlo,monospace;">${safePassword}</p>
      </div>
      <div style="text-align:center;margin:26px 0 18px 0;">
        <a href="${appUrl}/login" style="display:inline-block;background:#3c2923;color:#edeae2;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;padding:13px 26px;border-radius:999px;">ACESSAR O CRM</a>
      </div>
      <p style="font-size:13px;line-height:1.7;color:#857866;margin:0;">Troque a senha no primeiro acesso, em “Meu perfil”. Este e-mail é automático.</p>
    </div>
  </div>
</div>`,
          text: `Olá, ${name}!\n\nSeu usuário no CRM da Lara Café Advocacia foi criado.\n\nE-mail: ${email}\nSenha provisória: ${defaultPassword}\n\nAcesse: ${appUrl}/login\n\nTroque a senha no primeiro acesso.`
        })
      })
      emailSent = response.ok
      if (!response.ok) {
        console.error('[admin/users] Erro ao enviar email de convite:', await response.text())
      }
    } catch (err) {
      console.error('[admin/users] Erro ao enviar email de convite:', err)
    }
  }

  // Never return the password in the API response
  return { success: true, user: profile, emailSent }
})
