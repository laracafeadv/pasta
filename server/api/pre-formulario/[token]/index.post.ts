import { serverSupabaseServiceRole } from '#supabase/server'
import { useRuntimeConfig } from '#imports'
import { envioDoPreFormulario } from '../../../utils/formulario'
import { notificarEquipe, registrarAtividade } from '../../../utils/crm'
import { enviarEmailEquipe } from '../../../utils/email'

const txt = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

/** Normaliza uma resposta conforme o tipo da pergunta: string p/ maioria, string[] p/ seleção múltipla. */
function normalizarResposta(v: unknown, tipo: string): string | string[] | null {
  if (tipo === 'selecao_multipla') return Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean).slice(0, 20) : []
  return txt(Array.isArray(v) ? v[0] : v, 1000)
}

/** Resposta do formulário pré-consulta: contexto leve para a Dra. chegar preparada. */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const envio = await envioDoPreFormulario(admin, getRouterParam(event, 'token'))
  if (envio.respondido_em) throw createError({ statusCode: 409, message: 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  if (b.consentimento !== true) throw createError({ statusCode: 400, message: 'Para enviar, confirme que leu o aviso de privacidade.' })

  const resumo = txt(b.resumo, 600)
  if (!resumo) throw createError({ statusCode: 400, message: 'Conte um pouco da sua situação.' })

  const respostasBrutas = Array.isArray(b.respostas) ? b.respostas : []
  const linhas = envio.itens.map((item, i) => {
    const resposta = normalizarResposta(respostasBrutas[i], item.pergunta.tipo)
    const vazia = resposta == null || (Array.isArray(resposta) ? resposta.length === 0 : resposta === '')
    if (item.obrigatoria && vazia) throw createError({ statusCode: 400, message: `A pergunta "${item.pergunta.texto}" é obrigatória.` })
    return { envio_id: envio.id, ordem: i, pergunta_texto: item.pergunta.texto, pergunta_tipo: item.pergunta.tipo, resposta }
  })

  if (linhas.length) {
    const { error } = await admin.from('formulario_envio_respostas').insert(linhas)
    if (error) throw createError({ statusCode: 500, message: 'Não foi possível salvar as respostas.' })
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
