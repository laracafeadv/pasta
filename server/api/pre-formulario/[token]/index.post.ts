import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { contatoDoPreFormulario } from '../../../utils/formulario'
import { notificarEquipe, registrarAtividade } from '../../../utils/crm'
import { enviarEmailEquipe } from '../../../utils/email'

const txt = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

/** Resposta do formulário pré-consulta: contexto leve para a Dra. chegar preparada. */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const c = await contatoDoPreFormulario(admin, getRouterParam(event, 'token'))
  if (c.pre_form_respondido_em) throw createError({ statusCode: 409, message: 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  if (b.consentimento !== true) throw createError({ statusCode: 400, message: 'Para enviar, confirme que leu o aviso de privacidade.' })

  const resumo = txt(b.resumo, 600)
  if (!resumo) throw createError({ statusCode: 400, message: 'Conte um pouco da sua situação.' })

  await admin.from('contatos').update({
    resumo,
    ...(Array.isArray(b.respostasExtra) ? { pre_form_respostas_extra: b.respostasExtra.map(r => txt(r, 500)) } : {}),
    pre_form_respondido_em: new Date().toISOString(),
    consentimento_em: new Date().toISOString(),
  }).eq('id', c.id)

  await registrarAtividade(event, c.id, 'Sistema', 'Formulário pré-consulta respondido.')
  await notificarEquipe(event, 'Formulário pré-consulta respondido', `${c.nome ?? 'Uma pessoa'} respondeu antes da consulta. Já dá para olhar o contexto na ficha.`, { contato_id: c.id })
  const siteUrl = useRuntimeConfig().public.siteUrl
  await enviarEmailEquipe(
    event,
    `Formulário pré-consulta respondido — ${c.nome ?? 'novo contato'}`,
    `<p><b>${c.nome ?? 'Uma pessoa'}</b> respondeu o formulário antes da consulta.</p>
     <p><b>Situação:</b> ${resumo}</p>
     <p><a href="${siteUrl}/crm?abrir=${c.id}">Abrir a ficha no CRM</a></p>`,
  )
  return { ok: true }
})
