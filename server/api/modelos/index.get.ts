import { serverSupabaseClient } from '#supabase/server'
import type { ModeloMensagem } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'modelos/list')
  const client = await serverSupabaseClient(event)
  let q = client.from('modelos_mensagem').select('*').order('categoria').order('ordem')
  if (getQuery(event).todos !== '1') q = q.eq('ativo', true)
  const { data, error } = await q
  if (error) {
    console.error('[modelos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar modelos.' })
  }
  // Ordena as categorias pelo número ("2." antes de "10.")
  return ((data ?? []) as ModeloMensagem[]).sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR', { numeric: true }) || a.ordem - b.ordem)
})
