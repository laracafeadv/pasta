import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'documentos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ status?: string; observacao?: string | null; arquivo_url?: string | null; arquivo_nome?: string | null; processo_id?: number | null; parte_id?: number | null }>(event)
  const upd: Record<string, unknown> = { atualizado_em: new Date().toISOString(), atualizado_por: userId }
  if (body?.status !== undefined) {
    if (!['pendente', 'recebido', 'conferido', 'dispensado', 'rascunho', 'final'].includes(body.status)) throw createError({ statusCode: 400, message: 'Status inválido.' })
    upd.status = body.status
  }
  if (body?.observacao !== undefined) upd.observacao = body.observacao ? String(body.observacao).slice(0, 500) : null
  // Anexar o arquivo como link (Drive ou outro): guarda só a referência, sem copiar nada.
  if (body?.arquivo_url !== undefined) {
    const url = String(body.arquivo_url ?? '').trim()
    if (url && !/^https?:\/\//i.test(url)) throw createError({ statusCode: 400, message: 'Informe um link começando com http:// ou https://.' })
    upd.arquivo_url = url || null
    upd.arquivo_provedor = url ? (/drive\.google\.com|docs\.google\.com/i.test(url) ? 'drive' : 'link') : null
    upd.arquivo_nome = url ? String(body.arquivo_nome ?? '').trim().slice(0, 200) || null : null
    upd.arquivo_em = url ? new Date().toISOString() : null
  }
  if (body?.processo_id !== undefined) upd.processo_id = Number(body.processo_id) || null
  if (body?.parte_id !== undefined) upd.parte_id = Number(body.parte_id) || null
  const { data, error } = await (await serverSupabaseClient(event)).from('documentos').update(upd).eq('id', id).select().single()
  if (error) throw createError({ statusCode: 500, message: 'Erro ao atualizar documento.' })
  return data
})
