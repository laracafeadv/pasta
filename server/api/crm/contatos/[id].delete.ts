import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/delete')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  // Honorários, mensagens e atividades são removidos em cascata (LGPD: exclusão completa).
  const { error } = await client.from('contatos').delete().eq('id', id)
  if (error) {
    console.error('[crm] Erro ao excluir contato:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao excluir contato.' })
  }
  await auditar(event, 'excluiu contato e todo o histórico', 'contato', id)
  return { success: true }
})
