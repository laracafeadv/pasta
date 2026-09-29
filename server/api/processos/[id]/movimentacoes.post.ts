import { serverSupabaseClient } from '#supabase/server'
import { TIPOS_MOVIMENTACAO } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'movimentacoes/create')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<{ data?: string; tipo?: string; texto?: string }>(event)) ?? {}
  const texto = String(b.texto ?? '').trim().slice(0, 2000)
  if (!texto) throw createError({ statusCode: 400, message: 'Descreva a movimentação.' })
  const tipo = (TIPOS_MOVIMENTACAO as readonly string[]).includes(String(b.tipo)) ? String(b.tipo) : 'Andamento'
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(b.data ?? '')) ? b.data : new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const client = await serverSupabaseClient(event)
  const { data: criada, error } = await client.from('movimentacoes').insert({ processo_id: id, data, tipo, texto, autor_id: userId }).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao registrar a movimentação.' })
  await client.from('processos').update({ updated_at: new Date().toISOString() }).eq('id', id)
  return criada
})
