import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { CATEGORIAS_ARQUIVO } from '../../../shared/types/crm'

/** Recategoriza ou revincula um documento (categoria, caso, descrição). */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'arquivos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  const d: Record<string, unknown> = {}
  if (typeof b.categoria === 'string' && b.categoria in CATEGORIAS_ARQUIVO) d.categoria = b.categoria
  if ('caso_id' in b) d.caso_id = Number.isInteger(b.caso_id) && Number(b.caso_id) > 0 ? b.caso_id : null
  if ('descricao' in b) d.descricao = String(b.descricao ?? '').trim().slice(0, 300) || null
  const { error } = await (await serverSupabaseClient(event)).from('arquivos').update(d).eq('id', id)
  if (error) throw createError({ statusCode: 500, message: 'Erro ao salvar o documento.' })
  return { success: true }
})
