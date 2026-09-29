import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

// Documentos pedidos aos clientes, de todas as demandas: o que ainda falta chegar (ou já chegou).
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos/list')
  const q = getQuery(event)
  const status = ['pendente', 'recebido', 'conferido', 'dispensado', 'rascunho', 'final'].includes(String(q.status)) ? String(q.status) : 'pendente'
  let query = (await serverSupabaseClient(event)).from('documentos')
    .select('id, descricao, obrigatorio, status, origem, arquivo_url, arquivo_nome, atualizado_em, contato_id, caso_id, contato:contatos(id, nome), caso:casos(id, titulo)')
    .eq('status', status).order('contato_id').order('ordem').limit(1000)
  if (q.contato) query = query.eq('contato_id', Number(q.contato))
  const { data, error } = await query
  if (error) {
    console.error('[documentos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os documentos.' })
  }
  return data ?? []
})
