import { serverSupabaseClient } from '#supabase/server'
import type { Formulario } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/list')
  const client = await serverSupabaseClient(event)
  let q = client.from('formularios').select('*, itens:formulario_itens(id, pergunta_id, ordem, obrigatoria, pergunta:formulario_perguntas(*))').order('nome')
  if (getQuery(event).todos !== '1') q = q.eq('ativo', true)
  const { data, error } = await q
  if (error) {
    console.error('[formularios] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os formulários.' })
  }
  const formularios = (data ?? []) as Formulario[]
  for (const f of formularios) f.itens.sort((a, b) => a.ordem - b.ordem)
  return formularios
})
