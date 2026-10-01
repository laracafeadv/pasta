// API única (verify_jwt = false) do CRM no Supabase — sem Vercel:
//   /crm-api/whatsapp    webhook da Meta (GET verificação, POST mensagens/status/ecos)  → validado por assinatura HMAC
//   /crm-api/enviar      envio da fila whatsapp_saida (chamado pelo gatilho do banco e pelo pg_cron)
//   /crm-api/formulario  formulário público por link individual (GET estrutura, POST respostas)
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { enviarSaida, formularioPublico, receberWebhook } from '../_shared/handlers.ts'

Deno.serve((req) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const env = { get: (k: string) => Deno.env.get(k) }
  const rota = new URL(req.url).pathname.replace(/\/+$/, '')
  if (rota.endsWith('/whatsapp')) return receberWebhook(req, db, env)
  if (rota.endsWith('/enviar')) return enviarSaida(req, db, env)
  if (rota.endsWith('/formulario')) return formularioPublico(req, db)
  return new Response(JSON.stringify({ ok: true, rotas: ['whatsapp', 'enviar', 'formulario'] }), { headers: { 'Content-Type': 'application/json' } })
})
