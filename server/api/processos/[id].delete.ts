import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { auditar } from '../../utils/auditoria'

// Exclui o processo e as suas movimentações. Prazos ligados a ele ficam na demanda (processo_id vira nulo).
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'processos/delete')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { error } = await (await serverSupabaseClient(event)).from('processos').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao excluir.' })
  await auditar(event, 'excluiu processo', 'processo', id)
  return { success: true }
})
