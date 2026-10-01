import { serverSupabaseClient } from '#supabase/server'
import { ITENS_REVISAO, type ResultadoItem } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { hojeBR, registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'

/**
 * Revisão interna de um caso. Item com falha exige plano de ação, que vira
 * tarefa na agenda com responsável e data: a correção não depende de memória.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'qualidade/revisao')
  const body = await readBody<{ caso_id?: number; itens?: Record<string, ResultadoItem>; observacao?: string; plano_acao?: string; prazo?: string; responsavel_id?: string | null }>(event)
  const casoId = Number(body?.caso_id)
  if (!Number.isInteger(casoId) || casoId <= 0) throw createError({ statusCode: 400, message: 'Demanda inválida.' })
  const itens = Object.fromEntries(ITENS_REVISAO.map(i => [i.chave, (['ok', 'falha', 'na'] as const).includes(body.itens?.[i.chave] as ResultadoItem) ? body.itens![i.chave] : 'na']))
  const falhas = ITENS_REVISAO.filter(i => itens[i.chave] === 'falha')
  const plano = body.plano_acao?.trim().slice(0, 1000) || null
  if (falhas.length && !plano) throw createError({ statusCode: 400, message: 'Há itens com falha: descreva o plano de ação.' })
  if (plano && !/^\d{4}-\d{2}-\d{2}$/.test(body.prazo ?? '')) throw createError({ statusCode: 400, message: 'Defina o prazo do plano de ação.' })

  const client = await serverSupabaseClient(event)
  const { data: caso } = await client.from('casos').select('id, titulo, contato_id').eq('id', casoId).single()
  if (!caso) throw createError({ statusCode: 404, message: 'Demanda não encontrada.' })

  let compromissoId: number | null = null
  if (plano) {
    // O plano de ação é uma tarefa comum (aparece em Tarefas, Hoje e no Dashboard).
    const { error } = await client.from('tarefas_internas').insert({
      titulo: `Plano de ação (revisão): ${plano.slice(0, 120)}`, contato_id: caso.contato_id, caso_id: caso.id,
      prazo: body.prazo, prioridade: 'alta', descricao: `Falhas: ${falhas.map(f => f.rotulo).join('; ') || '—'}`,
    })
    if (error) console.error('[qualidade] Erro ao criar tarefa:', error)
  }
  const { data, error } = await client.from('revisoes').insert({
    caso_id: caso.id, revisor_id: userId, itens, aprovado: falhas.length === 0,
    observacao: body.observacao?.trim().slice(0, 1000) || null, plano_acao: plano, compromisso_id: compromissoId,
  }).select().single()
  if (error) {
    console.error('[qualidade] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao salvar a revisão.' })
  }
  await registrarAtividade(event, caso.contato_id, 'Sistema', `Revisão interna de "${caso.titulo}": ${falhas.length ? `${falhas.length} ponto(s) a corrigir até ${plano ? body.prazo!.split('-').reverse().join('/') : hojeBR()}` : 'aprovada'}.`, userId)
  await auditar(event, 'revisou demanda', 'demanda', caso.id, { aprovado: falhas.length === 0 })
  return data
})
