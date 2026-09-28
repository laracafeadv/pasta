import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/create')
  const b = (await readBody<{ titulo?: string; descricao?: string; coluna?: string }>(event)) ?? {}
  const titulo = String(b.titulo ?? '').trim().slice(0, 200)
  if (!titulo) throw createError({ statusCode: 400, message: 'Dê um título para a tarefa.' })
  const colunas = ['hoje', 'semana', 'mes', 'quando_der']
  const coluna = colunas.includes(String(b.coluna)) ? b.coluna : 'hoje'
  const { data, error } = await (await serverSupabaseClient(event)).from('tarefas_internas')
    .insert({ titulo, descricao: b.descricao?.trim().slice(0, 1000) || null, coluna }).select().single()
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao criar tarefa.' })
  }
  return data
})
