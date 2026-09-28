import { serverSupabaseClient } from '#supabase/server'
import type { Conteudo } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'conteudos/list')
  const { data, error } = await (await serverSupabaseClient(event)).from('conteudos')
    .select('*').order('data_publicacao', { ascending: true, nullsFirst: false }).order('created_at').limit(1000)
  if (error) {
    console.error('[conteudos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os conteúdos.' })
  }
  return (data ?? []) as Conteudo[]
})
