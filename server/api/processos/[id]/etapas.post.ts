import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { sincronizarFase } from '../../../utils/processos'

/** Acrescenta uma etapa formal ao procedimento extrajudicial (além das do modelo). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'processos/etapas/create')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<{ titulo?: string; data_prevista?: string | null }>(event)) ?? {}
  const titulo = String(b.titulo ?? '').trim().slice(0, 200)
  if (!titulo) throw createError({ statusCode: 400, message: 'Descreva a etapa.' })
  const client = await serverSupabaseClient(event)
  const { data: p } = await client.from('processos').select('natureza').eq('id', id).maybeSingle()
  if (!p) throw createError({ statusCode: 404, message: 'Não encontrado.' })
  if (p.natureza !== 'extrajudicial') throw createError({ statusCode: 400, message: 'Etapas formais são do procedimento extrajudicial. No processo judicial use a fase e as movimentações.' })
  const { data: ult } = await client.from('processo_etapas').select('ordem').eq('processo_id', id).order('ordem', { ascending: false }).limit(1)
  const { data, error } = await client.from('processo_etapas').insert({ processo_id: id, ordem: (ult?.[0]?.ordem ?? 0) + 1, titulo, data_prevista: /^\d{4}-\d{2}-\d{2}$/.test(String(b.data_prevista ?? '')) ? b.data_prevista : null }).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao criar a etapa.' })
  await sincronizarFase(client, id)
  return data
})
