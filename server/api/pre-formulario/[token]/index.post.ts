import { serverSupabaseServiceRole } from '#supabase/server'
import { AREAS, URGENCIAS } from '../../../../shared/types/crm'
import { contatoDoPreFormulario } from '../../../utils/formulario'
import { notificarEquipe, registrarAtividade } from '../../../utils/crm'

const txt = (v: unknown, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null

/** Resposta do formulário pré-consulta: contexto leve para a Dra. chegar preparada. */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const c = await contatoDoPreFormulario(admin, getRouterParam(event, 'token'))
  if (c.pre_form_respondido_em) throw createError({ statusCode: 409, message: 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  if (b.consentimento !== true) throw createError({ statusCode: 400, message: 'Para enviar, confirme que leu o aviso de privacidade.' })

  const area = Object.keys(AREAS).includes(String(b.area)) ? String(b.area) : null
  const urgencia = (URGENCIAS as readonly string[]).includes(String(b.urgencia)) ? String(b.urgencia) : null
  const resumo = txt(b.resumo, 600)
  if (!resumo) throw createError({ statusCode: 400, message: 'Conte um pouco da sua situação.' })

  await admin.from('contatos').update({
    ...(area ? { area } : {}),
    resumo,
    ...(txt(b.preocupacao, 400) ? { dor: txt(b.preocupacao, 400) } : {}),
    ...(txt(b.expectativa, 400) ? { objetivo: txt(b.expectativa, 400) } : {}),
    ...(urgencia ? { urgencia } : {}),
    ...(typeof b.processo_em_andamento === 'boolean' ? { processo_em_andamento: b.processo_em_andamento } : {}),
    ...(txt(b.resposta_extra, 500) ? { pre_form_resposta_extra: txt(b.resposta_extra, 500) } : {}),
    pre_form_respondido_em: new Date().toISOString(),
    consentimento_em: new Date().toISOString(),
  }).eq('id', c.id)

  await registrarAtividade(event, c.id, 'Sistema', 'Formulário pré-consulta respondido.')
  await notificarEquipe(event, 'Formulário pré-consulta respondido', `${c.nome ?? 'Uma pessoa'} respondeu antes da consulta. Já dá para olhar o contexto na ficha.`, { contato_id: c.id })
  return { ok: true }
})
