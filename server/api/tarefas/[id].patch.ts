import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

const CAMPOS = ['titulo', 'descricao', 'concluida', 'prazo', 'prioridade', 'contato_id', 'caso_id'] as const

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  const d: Record<string, unknown> = {}
  for (const c of CAMPOS) if (c in b) d[c] = b[c]
  if ('prazo' in d && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.prazo ?? ''))) throw createError({ statusCode: 400, message: 'Escolha a data da tarefa.' })
  d.updated_at = new Date().toISOString()
  const { data, error } = await (await serverSupabaseClient(event)).from('tarefas_internas').update(d).eq('id', id).select().single()
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao atualizar tarefa.' })
  }
  return data
})
