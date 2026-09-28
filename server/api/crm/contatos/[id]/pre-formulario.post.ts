import { randomBytes } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { PRE_FORM_VALIDADE_DIAS } from '../../../../utils/formulario'
import { registrarAtividade } from '../../../../utils/crm'

/** Gera um novo envio do formulário pré-consulta: resumo livre sempre, mais as perguntas do formulário escolhido (opcional). Vale 14 dias. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/pre-formulario')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = (await readBody<{ formulario_id?: number | null }>(event).catch(() => null)) ?? {}
  const formularioId = Number.isInteger(body.formulario_id) && Number(body.formulario_id) > 0 ? Number(body.formulario_id) : null

  const admin = serverSupabaseServiceRole(event)
  const token = randomBytes(24).toString('base64url')
  const expira = new Date(Date.now() + PRE_FORM_VALIDADE_DIAS * 864e5).toISOString()

  const { error } = await admin.from('formulario_envios').insert({
    formulario_id: formularioId, contato_id: id, token, expira_em: expira, status: 'enviado',
  })
  if (error) {
    console.error('[pre-formulario] Erro:', error)
    throw createError({ statusCode: 500, message: 'Não foi possível gerar o link.' })
  }
  await admin.from('contatos').update({ pre_form_respondido_em: null }).eq('id', id)
  await registrarAtividade(event, id, 'Sistema', 'Link do formulário pré-consulta gerado (válido por 14 dias).', userId)
  return { caminho: `/pc/${token}`, expira }
})
