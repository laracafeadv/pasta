import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { garantirPastaCliente } from '../../../../utils/drive'
import { registrarAtividade } from '../../../../utils/crm'
import { auditar } from '../../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/drive')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const r = await garantirPastaCliente(serverSupabaseServiceRole(event), id)
  await registrarAtividade(event, id, 'Sistema', 'Pasta do cliente no Google Drive criada/conferida.', userId)
  await auditar(event, 'criou pasta no Drive', 'contato', id)
  return { url: r.url }
})
