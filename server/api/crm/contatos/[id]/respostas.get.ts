import { serverSupabaseClient } from '#supabase/server'
import type { PerguntaDaFicha, SecaoDaFicha, ValorResposta } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'

/**
 * Informações montadas a partir do construtor de formulários.
 *  - sem ?caso_id: perguntas de escopo "cliente" (permanentes) com as respostas do cliente;
 *  - com ?caso_id: perguntas de escopo "demanda" (as que valem para o procedimento da demanda)
 *    com as respostas daquela demanda.
 * Toda pergunta ativa aparece (respondida ou não), na seção e ordem configuradas; arquivada só
 * aparece se já tem resposta (histórico preservado).
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/respostas')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const casoId = Number(getQuery(event).caso_id) || null
  const client = await serverSupabaseClient(event)

  let procedimento: string | null = null
  if (casoId) {
    const { data: caso } = await client.from('casos').select('procedimento').eq('id', casoId).eq('contato_id', id).maybeSingle()
    if (!caso) throw createError({ statusCode: 404, message: 'Demanda não encontrada.' })
    procedimento = caso.procedimento
  }

  const [perguntas, respostas] = await Promise.all([
    client.from('formulario_perguntas').select('id, texto, tipo, opcoes, ajuda, arquivada, secao, ordem, procedimentos').eq('escopo', casoId ? 'demanda' : 'cliente').order('ordem').order('id'),
    casoId
      ? client.from('caso_respostas').select('pergunta_id, resposta, updated_at').eq('caso_id', casoId)
      : client.from('contato_respostas').select('pergunta_id, resposta, updated_at').eq('contato_id', id),
  ])
  if (perguntas.error || respostas.error) {
    console.error('[crm/respostas] Erro:', perguntas.error ?? respostas.error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar as informações.' })
  }
  const porPergunta = new Map((respostas.data ?? []).map(r => [r.pergunta_id as number, r]))
  const secoes = new Map<string, PerguntaDaFicha[]>()
  for (const p of perguntas.data ?? []) {
    const r = porPergunta.get(p.id)
    if (p.arquivada && !r) continue
    // Pergunta restrita a procedimentos: só aparece nas demandas desses procedimentos (ou se já tem resposta).
    if (casoId && p.procedimentos?.length && !r && !(procedimento && p.procedimentos.includes(procedimento))) continue
    const item: PerguntaDaFicha = {
      id: p.id, texto: p.texto, tipo: p.tipo, opcoes: p.opcoes ?? [], ajuda: p.ajuda, arquivada: p.arquivada,
      resposta: (r?.resposta ?? null) as ValorResposta, respondido_em: r?.updated_at ?? null,
    }
    const nome = p.arquivada ? 'Perguntas arquivadas' : (p.secao || 'Geral')
    secoes.set(nome, [...(secoes.get(nome) ?? []), item])
  }
  const lista: SecaoDaFicha[] = [...secoes.entries()].map(([nome, perguntasDaSecao]) => ({ nome, perguntas: perguntasDaSecao }))
  lista.sort((a, b) => Number(a.nome === 'Perguntas arquivadas') - Number(b.nome === 'Perguntas arquivadas'))
  return lista
})
