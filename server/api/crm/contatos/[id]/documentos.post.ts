import { serverSupabaseClient } from '#supabase/server'
import { DOCUMENTOS_POR_AREA } from '../../../../../shared/types/crm'
import { SERVICOS } from '../../../../../shared/data/servicos'
import { PROCEDIMENTOS } from '../../../../../shared/data/checklist'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'

/**
 * Checklist de documentos do cliente.
 * - { gerar: true, caso_id }: cria a lista de documentos da DEMANDA (do procedimento dela; se não tiver,
 *   a da área do cliente), sem duplicar itens existentes.
 * - { descricao, obrigatorio, caso_id? }: acrescenta um item avulso.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'documentos/create')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ gerar?: boolean; descricao?: string; obrigatorio?: boolean; caso_id?: number | null; processo_id?: number | null; parte_id?: number | null; origem?: string }>(event)
  const processoId = Number(body?.processo_id) || null
  const parteId = Number(body?.parte_id) || null
  const origem = body?.origem === 'produzido' ? 'produzido' : 'solicitado'
  const casoId = Number(body?.caso_id) || null

  const { data: contato } = await client.from('contatos').select('area').eq('id', id).single()
  if (!contato) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })
  let procedimento: string | null = null
  if (casoId) {
    const { data: caso } = await client.from('casos').select('procedimento, area').eq('id', casoId).eq('contato_id', id).maybeSingle()
    if (!caso) throw createError({ statusCode: 404, message: 'Demanda não encontrada.' })
    procedimento = caso.procedimento
  }
  const { data: existentes } = await client.from('documentos').select('descricao, ordem, caso_id').eq('contato_id', id)
  // Evita repetir só dentro do mesmo escopo: a mesma lista pode existir em outra demanda.
  const ja = new Set((existentes ?? []).filter(d => (d.caso_id ?? null) === casoId).map(d => d.descricao.toLowerCase()))
  let ordem = Math.max(0, ...(existentes ?? []).map(d => d.ordem)) + 1

  let itens: [string, boolean][]
  if (body?.gerar) {
    const servico = SERVICOS.find(x => x.id === PROCEDIMENTOS.find(p => p.valor === procedimento)?.servico)
    itens = servico
      ? servico.documentos.flatMap(g => g.itens.map(i => [i, true] as [string, boolean]))
      : [...DOCUMENTOS_POR_AREA['*']!, ...(DOCUMENTOS_POR_AREA[contato.area ?? ''] ?? []), ...DOCUMENTOS_POR_AREA.fim!]
  } else {
    const desc = body?.descricao?.trim()
    if (!desc) throw createError({ statusCode: 400, message: 'Descreva o documento.' })
    itens = [[desc.slice(0, 200), body.obrigatorio !== false]]
  }
  const novos = itens.filter(([d]) => !ja.has(d.toLowerCase())).map(([descricao, obrigatorio]) => ({
    contato_id: id, caso_id: casoId, processo_id: body?.gerar ? null : processoId, parte_id: body?.gerar ? null : parteId, origem: body?.gerar ? 'solicitado' : origem, status: !body?.gerar && origem === 'produzido' ? 'rascunho' : 'pendente', descricao, obrigatorio, ordem: ordem++, atualizado_por: userId,
  }))
  if (novos.length) {
    const { error } = await client.from('documentos').insert(novos)
    if (error) {
      console.error('[documentos] Erro:', error)
      throw createError({ statusCode: 500, message: 'Erro ao criar checklist.' })
    }
    if (body?.gerar) await registrarAtividade(event, id, 'Sistema', `Checklist de documentos criado (${novos.length} itens${casoId ? ', desta demanda' : ''}).`, userId, null, casoId)
  }
  return { criados: novos.length }
})
