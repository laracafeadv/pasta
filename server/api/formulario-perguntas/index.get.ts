import { serverSupabaseClient } from '#supabase/server'
import type { FormularioPergunta } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formulario-perguntas/list')
  const client = await serverSupabaseClient(event)
  let q = client.from('formulario_perguntas').select('*').order('ordem').order('id')
  if (getQuery(event).todas !== '1') q = q.eq('arquivada', false)
  const { data, error } = await q
  if (error) {
    console.error('[formulario-perguntas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar as perguntas.' })
  }
  return (data ?? []) as FormularioPergunta[]
})
