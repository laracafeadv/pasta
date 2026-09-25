import { randomBytes } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { FORM_VALIDADE_DIAS } from '../../../../utils/formulario'
import { registrarAtividade } from '../../../../utils/crm'

/** Gera (ou renova) o link do formulário da cliente. Vale 30 dias; o anterior deixa de funcionar. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/formulario')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const token = randomBytes(24).toString('base64url')
  const expira = new Date(Date.now() + FORM_VALIDADE_DIAS * 864e5).toISOString()
  const { error } = await serverSupabaseServiceRole(event).from('contatos')
    .update({ form_token: token, form_expira: expira, form_respondido_em: null, form_arquivos: 0 }).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Não foi possível gerar o link.' })
  await registrarAtividade(event, id, 'Sistema', 'Link do formulário da cliente gerado (válido por 30 dias).', userId)
  return { caminho: `/f/${token}`, expira }
})
