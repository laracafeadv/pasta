import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'
import { limparPecaModelo } from '../../../utils/pecasModelos'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'pecas/modelos/post')
  const { data, error } = await serverSupabaseServiceRole(event).from('pecas_modelos').insert(limparPecaModelo(await readBody(event))).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um modelo com esse título.' })
    throw createError({ statusCode: 500, message: 'Erro interno ao salvar o modelo.' })
  }
  await auditar(event, 'criou modelo de peça', 'peca_modelo', data.id)
  return data
})
