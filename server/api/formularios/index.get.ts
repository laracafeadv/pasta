import { serverSupabaseClient } from '#supabase/server'
import type { Formulario } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'

/** Lista de formulários. ?contexto=cliente,consulta filtra pelo contexto; ?todos=1 inclui os inativos. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/list')
  const client = await serverSupabaseClient(event)
  let q = client.from('formularios').select('id, nome, descricao, contexto, procedimentos, ativo, updated_at, itens:formulario_itens(id, pergunta_id, ordem, obrigatoria, pergunta:formulario_perguntas(id, texto, tipo))').order('nome')
  if (getQuery(event).todos !== '1') q = q.eq('ativo', true)
  const contextos = String(getQuery(event).contexto ?? '').split(',').filter(c => ['cliente', 'consulta', 'demanda'].includes(c))
  if (contextos.length) q = q.in('contexto', contextos)
  const { data, error } = await q
  if (error) {
    console.error('[formularios] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar os formulários.' })
  }
  const formularios = (data ?? []) as unknown as Formulario[]
  for (const f of formularios) f.itens.sort((a, b) => a.ordem - b.ordem)
  return formularios
})
