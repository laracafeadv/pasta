import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'
import { limparPecaModelo } from '../../../utils/pecasModelos'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'pecas/modelos/put')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { data, error } = await serverSupabaseServiceRole(event).from('pecas_modelos').update(limparPecaModelo(await readBody(event))).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro interno ao salvar o modelo.' })
  await auditar(event, 'alterou modelo de peça', 'peca_modelo', id)
  return data
})
