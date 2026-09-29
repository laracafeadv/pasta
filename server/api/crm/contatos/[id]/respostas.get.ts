import { serverSupabaseClient } from '#supabase/server'
import type { SecaoDaFicha } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { montarFicha } from '../../../../utils/formularioEstrutura'

/**
 * Informações do cliente/demanda, montadas a partir dos formulários (contexto + seções + perguntas).
 *  - sem ?caso_id: formulários de contexto cliente/consulta, respostas do cliente;
 *  - com ?caso_id: formulários de contexto demanda (os que valem para o procedimento da demanda), respostas da demanda.
 * Não copia dados: lê a resposta atual de contato_respostas / caso_respostas. Resposta de pergunta que saiu do
 * formulário continua visível em "Fora do formulário".
 */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/respostas')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const casoId = Number(getQuery(event).caso_id) || null
  const secoes = await montarFicha(await serverSupabaseClient(event), id, casoId)
  return secoes.map(s => ({
    nome: s.nome, formulario_id: s.formulario_id, mostrar_se: s.mostrar_se,
    perguntas: s.perguntas.map(p => ({ id: p.pergunta_id, texto: p.texto, tipo: p.tipo, opcoes: p.opcoes, ajuda: p.ajuda, obrigatoria: p.obrigatoria, arquivada: !!p.fora_do_formulario, mostrar_se: p.mostrar_se, resposta: p.resposta, respondido_em: p.respondido_em })),
  })) as SecaoDaFicha[]
})
