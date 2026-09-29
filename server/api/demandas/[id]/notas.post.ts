import { serverSupabaseClient } from '#supabase/server'
import { TIPOS_NOTA_DEMANDA } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { auditar } from '../../../utils/auditoria'

/** Registra uma anotação datada na análise da demanda (raciocínio, conclusão ou observação do escritório). */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'demandas/notas/create')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ texto?: string; tipo?: string }>(event)
  const texto = String(body?.texto ?? '').trim().slice(0, 4000)
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva a anotação.' })
  const tipo = body?.tipo && body.tipo in TIPOS_NOTA_DEMANDA ? body.tipo : 'anotacao'
  const client = await serverSupabaseClient(event)
  const { data: caso } = await client.from('casos').select('id, contato_id').eq('id', id).maybeSingle()
  if (!caso) throw createError({ statusCode: 404, message: 'Demanda não encontrada.' })
  const { data, error } = await client.from('demanda_notas').insert({ caso_id: id, contato_id: caso.contato_id, autor_id: userId, tipo, texto }).select('id, created_at, caso_id, tipo, texto, autor_id').single()
  if (error) {
    console.error('[demandas/notas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Não foi possível salvar a anotação.' })
  }
  await auditar(event, 'anotou na análise da demanda', 'demanda', id, { nota_id: data.id })
  return data
})
