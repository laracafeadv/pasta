import { serverSupabaseClient } from '#supabase/server'
import type { DocumentoGerado } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { sanitizarBusca } from '../../utils/crm'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documentos-gerados/list')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)

  let query = client.from('documentos_gerados')
    .select('id, created_at, modelo_id, nome, categoria, contato_id, caso_id, honorario_id, valor, dados, contato:contatos(nome), modelo:documento_modelos(nome)')
    .order('created_at', { ascending: false })
    .limit(300)

  if (q.categoria) query = query.eq('categoria', String(q.categoria))
  if (q.contato_id) query = query.eq('contato_id', Number(q.contato_id))
  const busca = sanitizarBusca(q.busca)
  if (busca) query = query.ilike('nome', `%${busca}%`)

  const { data, error } = await query
  if (error) {
    console.error('[documentos-gerados] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os documentos.' })
  }
  return (data ?? []).map((d: any) => ({ ...d, contato_nome: d.contato?.nome ?? null, modelo_nome: d.modelo?.nome ?? null })) as DocumentoGerado[]
})
