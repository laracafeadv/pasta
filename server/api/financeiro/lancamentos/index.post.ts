import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../../utils/security'
import { limparLancamento } from '../../../utils/lancamentos'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'financeiro/lancamentos/post')
  const d = limparLancamento(await readBody(event))
  const { data, error } = await serverSupabaseServiceRole(event).from('lancamentos').insert(d).select().single()
  if (error) {
    console.error('[financeiro] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao salvar o lançamento.' })
  }
  await auditar(event, 'criou lançamento', 'lancamento', data.id)
  return data
})
