import { serverSupabaseClient } from '#supabase/server'
import type { DocumentoModelo } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'documento-modelos/list')
  const client = await serverSupabaseClient(event)
  let q = client.from('documento_modelos').select('*').order('nome')
  if (getQuery(event).todos !== '1') q = q.eq('ativo', true)
  const { data, error } = await q
  if (error) {
    console.error('[documento-modelos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os modelos.' })
  }
  return (data ?? []) as DocumentoModelo[]
})
