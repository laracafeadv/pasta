import { serverSupabaseClient } from '#supabase/server'
import type { FormularioTemplate } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/list')
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('formulario_templates').select('*').order('nome')
  if (error) {
    console.error('[formularios] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os modelos de formulário.' })
  }
  return (data ?? []) as FormularioTemplate[]
})
