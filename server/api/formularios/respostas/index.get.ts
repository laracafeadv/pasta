import { serverSupabaseClient } from '#supabase/server'
import type { FormularioEnvio } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'formularios/respostas')
  const client = await serverSupabaseClient(event)
  const q = getQuery(event)

  let query = client.from('formulario_envios')
    .select('id, created_at, formulario_id, contato_id, token, expira_em, visualizado_em, respondido_em, status, contato:contatos(nome), formulario:formularios(nome)')
    .order('created_at', { ascending: false })
    .limit(300)

  if (q.formulario_id) query = query.eq('formulario_id', Number(q.formulario_id))
  if (q.de) query = query.gte('created_at', String(q.de))
  if (q.ate) query = query.lte('created_at', String(q.ate))

  const { data, error } = await query
  if (error) {
    console.error('[formularios/respostas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar as respostas.' })
  }

  let envios = (data ?? []).map((e: any) => ({
    ...e, contato_nome: e.contato?.nome ?? null, formulario_nome: e.formulario?.nome ?? null,
  })) as FormularioEnvio[]

  const busca = String(q.busca ?? '').trim().toLowerCase()
  if (busca) envios = envios.filter(e => (e.contato_nome ?? '').toLowerCase().includes(busca))

  return envios
})
