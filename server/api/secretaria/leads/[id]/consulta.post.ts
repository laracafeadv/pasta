import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { apiGoogleDoUsuario } from '../../../../utils/googleApi'
import { marcarConsulta } from '../../../../utils/leadsSecretaria'
import { auditar } from '../../../../utils/auditoria'

/** Marca a consulta do lead direto no Google Agenda (lembretes 1 dia e 1 hora antes). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lead-consulta')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { api } = await apiGoogleDoUsuario(event, userId)
  const r = await marcarConsulta(api, await serverSupabaseClient(event), id, (await readBody(event)) ?? {})
  await auditar(event, 'marcou consulta de lead (Secretária)', 'lead', id)
  return r
})
