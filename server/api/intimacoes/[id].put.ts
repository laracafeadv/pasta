import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { definirPrazoIntimacao, limparIntimacao } from '../../utils/intimacoes'
import { auditar } from '../../utils/auditoria'

/** Ajusta a intimação: conteúdo/tipo e, principalmente, define ou corrige o prazo em dias úteis. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'intimacoes/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = (await readBody(event)) ?? {}
  const d = limparIntimacao(body, { parcial: true })
  const client = await serverSupabaseClient(event)
  const simples: Record<string, unknown> = {}
  if ('conteudo' in d) simples.conteudo = d.conteudo
  if ('tipo' in d) simples.tipo = d.tipo
  if (Object.keys(simples).length) {
    const { error } = await client.from('intimacoes').update(simples).eq('id', id)
    if (error) throw createError({ statusCode: 500, message: 'Erro ao salvar.' })
  }
  const r = d.dias_prazo ? await definirPrazoIntimacao(event, client, id, d.dias_prazo, d.data_publicacao ?? null, userId) : null
  await auditar(event, 'editou intimação', 'intimacao', id, { campos: Object.keys(d) })
  return { success: true, ...(r ?? {}) }
})
