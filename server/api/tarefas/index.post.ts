import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'tarefas/create')
  const b = (await readBody<{ titulo?: string; descricao?: string; prazo?: string; prioridade?: string; contato_id?: number | null; caso_id?: number | null; processo_id?: number | null }>(event)) ?? {}
  const titulo = String(b.titulo ?? '').trim().slice(0, 200)
  if (!titulo) throw createError({ statusCode: 400, message: 'Dê um título para a tarefa.' })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.prazo ?? ''))) throw createError({ statusCode: 400, message: 'Escolha a data da tarefa.' })
  const prioridades = ['baixa', 'media', 'alta']
  const prioridade = prioridades.includes(String(b.prioridade)) ? b.prioridade : 'media'
  const { data, error } = await (await serverSupabaseClient(event)).from('tarefas_internas')
    .insert({
      titulo, descricao: b.descricao?.trim().slice(0, 1000) || null, prioridade,
      prazo: b.prazo,
      contato_id: Number.isInteger(b.contato_id) ? b.contato_id : null,
      caso_id: Number.isInteger(b.caso_id) ? b.caso_id : null,
      processo_id: Number.isInteger(b.processo_id) ? b.processo_id : null,
    }).select().single()
  if (error) {
    console.error('[tarefas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao criar tarefa.' })
  }
  return data
})
