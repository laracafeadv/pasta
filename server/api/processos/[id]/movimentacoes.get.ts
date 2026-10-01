import { serverSupabaseClient } from '#supabase/server'
import type { Movimentacao } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'movimentacoes/list')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('movimentacoes').select('*').eq('processo_id', id).order('data', { ascending: false }).order('id', { ascending: false }).limit(300)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao carregar as movimentações.' })
  return (data ?? []) as Movimentacao[]
})
