import { serverSupabaseClient } from '#supabase/server'
import { DOCUMENTOS_POR_AREA } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'

/**
 * Checklist de documentos do cliente.
 * - { gerar: true }: cria a lista padrão da área do contato (sem duplicar itens existentes).
 * - { descricao, obrigatorio }: acrescenta um item avulso.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'documentos/create')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ gerar?: boolean; descricao?: string; obrigatorio?: boolean }>(event)

  const { data: contato } = await client.from('contatos').select('area').eq('id', id).single()
  if (!contato) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })
  const { data: existentes } = await client.from('documentos').select('descricao, ordem').eq('contato_id', id)
  const ja = new Set((existentes ?? []).map(d => d.descricao.toLowerCase()))
  let ordem = Math.max(0, ...(existentes ?? []).map(d => d.ordem)) + 1

  let itens: [string, boolean][]
  if (body?.gerar) {
    itens = [...DOCUMENTOS_POR_AREA['*']!, ...(DOCUMENTOS_POR_AREA[contato.area ?? ''] ?? []), ...DOCUMENTOS_POR_AREA.fim!]
  } else {
    const desc = body?.descricao?.trim()
    if (!desc) throw createError({ statusCode: 400, message: 'Descreva o documento.' })
    itens = [[desc.slice(0, 200), body.obrigatorio !== false]]
  }
  const novos = itens.filter(([d]) => !ja.has(d.toLowerCase())).map(([descricao, obrigatorio]) => ({
    contato_id: id, descricao, obrigatorio, ordem: ordem++, atualizado_por: userId,
  }))
  if (novos.length) {
    const { error } = await client.from('documentos').insert(novos)
    if (error) {
      console.error('[documentos] Erro:', error)
      throw createError({ statusCode: 500, message: 'Erro ao criar checklist.' })
    }
    if (body?.gerar) await registrarAtividade(event, id, 'Sistema', `Checklist de documentos criado (${novos.length} itens).`, userId)
  }
  return { criados: novos.length }
})
