import { serverSupabaseClient } from '#supabase/server'
import type { Arquivo } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { sanitizarBusca } from '../../utils/crm'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'arquivos/list')
  const q = getQuery(event)
  let query = (await serverSupabaseClient(event)).from('arquivos')
    .select('id, created_at, contato_id, caso_id, categoria, nome, descricao, mime, tamanho, contato:contatos(id, nome), caso:casos(id, titulo)')
    .order('created_at', { ascending: false })
    .limit(500)
  if (q.contato_id) query = query.eq('contato_id', Number(q.contato_id))
  if (q.caso_id) query = query.eq('caso_id', Number(q.caso_id))
  if (q.categoria) query = query.eq('categoria', String(q.categoria))
  const busca = sanitizarBusca(q.busca)
  if (busca) query = query.or(`nome.ilike.%${busca}%,descricao.ilike.%${busca}%`)
  const { data, error } = await query
  if (error) {
    console.error('[arquivos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os documentos.' })
  }
  return (data ?? []) as unknown as Arquivo[]
})
