import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'
import { limparLancamento } from '../../../utils/lancamentos'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'financeiro/lancamentos/patch')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparLancamento(await readBody(event), true)
  const { data, error } = await serverSupabaseServiceRole(event).from('lancamentos').update(d).eq('id', id).select().single()
  if (error) {
    console.error('[financeiro] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao atualizar o lançamento.' })
  }
  await auditar(event, 'alterou lançamento', 'lancamento', id, { campos: Object.keys(d) })
  return data
})
