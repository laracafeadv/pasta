import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/create')
  const b = (await readBody<{ titulo?: string; descricao?: string; coluna?: string; prazo?: string | null; prioridade?: string; contato_id?: number | null; caso_id?: number | null }>(event)) ?? {}
  const titulo = String(b.titulo ?? '').trim().slice(0, 200)
  if (!titulo) throw createError({ statusCode: 400, message: 'Dê um título para a tarefa.' })
  const colunas = ['hoje', 'semana', 'mes', 'quando_der']
  const coluna = colunas.includes(String(b.coluna)) ? b.coluna : 'hoje'
  const prioridades = ['baixa', 'media', 'alta']
  const prioridade = prioridades.includes(String(b.prioridade)) ? b.prioridade : 'media'
  const { data, error } = await (await serverSupabaseClient(event)).from('tarefas_internas')
    .insert({
      titulo, descricao: b.descricao?.trim().slice(0, 1000) || null, coluna, prioridade,
      prazo: b.prazo || null,
      contato_id: Number.isInteger(b.contato_id) ? b.contato_id : null,
      caso_id: Number.isInteger(b.caso_id) ? b.caso_id : null,
    }).select().single()
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao criar tarefa.' })
  }
  return data
})
