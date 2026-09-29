import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { envioDoPreFormulario } from '../../../utils/formulario'
import { validarRespostasPublicas } from '../../../utils/formularioEstrutura'
import { notificarEquipe, registrarAtividade } from '../../../utils/crm'
import { enviarEmailEquipe } from '../../../utils/email'

const txt = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

/** Resposta do formulário pré-consulta: contexto leve para a Dra. chegar preparada. */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const envio = await envioDoPreFormulario(admin, getRouterParam(event, 'token'))
  if (envio.respondido_em) throw createError({ statusCode: 409, message: 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  if (b.consentimento !== true) throw createError({ statusCode: 400, message: 'Para enviar, confirme que leu o aviso de privacidade.' })

  const resumo = txt(b.resumo, 600)
  if (!resumo) throw createError({ statusCode: 400, message: 'Conte um pouco da sua situação.' })

  // Mesma lógica condicional da tela: pergunta escondida não é obrigatória e sua resposta é descartada.
  const secoes = envio.estrutura?.secoes ?? []
  const brutas = b.respostas && typeof b.respostas === 'object' && !Array.isArray(b.respostas) ? (b.respostas as Record<string, unknown>) : {}
  const { linhas, validas } = validarRespostasPublicas(secoes, brutas)

  if (linhas.length) {
    const { error } = await admin.from('formulario_envio_respostas').insert(linhas.map(l => ({ ...l, envio_id: envio.id })))
    if (error) throw createError({ statusCode: 500, message: 'Não foi possível salvar as respostas.' })
  }

  // A ficha do cliente mostra a resposta atual de cada pergunta: grava o que ele acabou de responder.
  // Formulário de contexto "demanda" fica só no envio até existir a demanda.
  if (envio.estrutura?.contexto !== 'demanda' && validas.size) {
    const atuais = [...validas.entries()].map(([pergunta_id, resposta]) => ({ contato_id: envio.contato_id, pergunta_id, resposta, updated_at: new Date().toISOString() }))
    await admin.from('contato_respostas').upsert(atuais, { onConflict: 'contato_id,pergunta_id' })
  }

  const agora = new Date().toISOString()
  await admin.from('formulario_envios').update({ respondido_em: agora, status: 'respondido' }).eq('id', envio.id)
  await admin.from('contatos').update({ resumo, pre_form_respondido_em: agora, consentimento_em: agora }).eq('id', envio.contato_id)

  await registrarAtividade(event, envio.contato_id, 'Sistema', 'Formulário pré-consulta respondido.')
  const nomeContato = envio.contato?.nome
  await notificarEquipe(event, 'Formulário pré-consulta respondido', `${nomeContato ?? 'Uma pessoa'} respondeu antes da consulta. Já dá para olhar as respostas na ficha.`, { contato_id: envio.contato_id })
  const siteUrl = useRuntimeConfig().public.siteUrl
  await enviarEmailEquipe(
    event,
    `Formulário pré-consulta respondido — ${nomeContato ?? 'novo contato'}`,
    `<p><b>${nomeContato ?? 'Uma pessoa'}</b> respondeu o formulário antes da consulta.</p>
     <p><b>Situação:</b> ${resumo}</p>
     <p><a href="${siteUrl}/crm?abrir=${envio.contato_id}">Abrir a ficha no CRM</a></p>`,
  )
  return { ok: true }
})
