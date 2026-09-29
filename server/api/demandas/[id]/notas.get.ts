import { serverSupabaseClient } from '#supabase/server'
import type { DemandaNota } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

/** Anotações datadas da análise profissional de uma demanda (mais recentes primeiro). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'demandas/notas')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const { data, error } = await (await serverSupabaseClient(event)).from('demanda_notas').select('id, created_at, caso_id, tipo, texto, autor_id, autor:profiles(name)').eq('caso_id', id).order('created_at', { ascending: false }).order('id', { ascending: false })
  if (error) throw createError({ statusCode: 500, message: 'Erro ao carregar as anotações.' })
  return (data ?? []).map((n: any) => ({ id: n.id, created_at: n.created_at, caso_id: n.caso_id, tipo: n.tipo, texto: n.texto, autor_id: n.autor_id, autor_nome: n.autor?.name ?? null })) as DemandaNota[]
})
