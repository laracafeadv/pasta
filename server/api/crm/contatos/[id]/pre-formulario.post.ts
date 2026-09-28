import { randomBytes } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { PRE_FORM_VALIDADE_DIAS } from '../../../../utils/formulario'
import { registrarAtividade } from '../../../../utils/crm'

/** Gera (ou renova) o link do formulário pré-consulta. Vale 14 dias; o anterior deixa de funcionar. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/pre-formulario')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = (await readBody<{ perguntaExtra?: string }>(event).catch(() => null)) ?? {}
  const perguntaExtra = typeof body.perguntaExtra === 'string' ? body.perguntaExtra.trim().slice(0, 300) || null : null
  const token = randomBytes(24).toString('base64url')
  const expira = new Date(Date.now() + PRE_FORM_VALIDADE_DIAS * 864e5).toISOString()
  const { error } = await serverSupabaseServiceRole(event).from('contatos')
    .update({ pre_form_token: token, pre_form_expira: expira, pre_form_respondido_em: null, pre_form_pergunta_extra: perguntaExtra, pre_form_resposta_extra: null })
    .eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Não foi possível gerar o link.' })
  await registrarAtividade(event, id, 'Sistema', 'Link do formulário pré-consulta gerado (válido por 14 dias).', userId)
  return { caminho: `/pc/${token}`, expira }
})
