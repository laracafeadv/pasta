import { serverSupabaseClient } from '#supabase/server'
import type { PerguntaDaFicha, SecaoDaFicha, ValorResposta } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'

/**
 * "Informações do cliente": montadas a partir do construtor de formulários. Toda pergunta ativa
 * aparece (respondida ou não), agrupada na seção e na ordem configuradas; pergunta arquivada só
 * aparece se este cliente já tem resposta guardada (histórico preservado).
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/respostas')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const [perguntas, respostas] = await Promise.all([
    client.from('formulario_perguntas').select('id, texto, tipo, opcoes, ajuda, arquivada, secao, ordem').order('ordem').order('id'),
    client.from('contato_respostas').select('pergunta_id, resposta, updated_at').eq('contato_id', id),
  ])
  if (perguntas.error || respostas.error) {
    console.error('[crm/respostas] Erro:', perguntas.error ?? respostas.error)
    throw createError({ statusCode: 500, message: 'Erro ao carregar as informações do cliente.' })
  }
  const porPergunta = new Map((respostas.data ?? []).map(r => [r.pergunta_id as number, r]))
  const secoes = new Map<string, PerguntaDaFicha[]>()
  for (const p of perguntas.data ?? []) {
    const r = porPergunta.get(p.id)
    if (p.arquivada && !r) continue
    const item: PerguntaDaFicha = {
      id: p.id, texto: p.texto, tipo: p.tipo, opcoes: p.opcoes ?? [], ajuda: p.ajuda, arquivada: p.arquivada,
      resposta: (r?.resposta ?? null) as ValorResposta, respondido_em: r?.updated_at ?? null,
    }
    const nome = p.arquivada ? 'Perguntas arquivadas' : (p.secao || 'Geral')
    secoes.set(nome, [...(secoes.get(nome) ?? []), item])
  }
  // Seções na ordem da primeira pergunta de cada uma; arquivadas sempre por último.
  const lista: SecaoDaFicha[] = [...secoes.entries()].map(([nome, perguntasDaSecao]) => ({ nome, perguntas: perguntasDaSecao }))
  lista.sort((a, b) => Number(a.nome === 'Perguntas arquivadas') - Number(b.nome === 'Perguntas arquivadas'))
  return lista
})
