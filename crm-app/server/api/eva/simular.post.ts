import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin, throwSanitizedInternalError } from '../../utils/security'
import { carregarEscritorio } from '../../utils/escritorio'
import { buscarConhecimento, carregarPrompt, criarOpenAI, gerarResposta, type MensagemHistorico } from '../../utils/agente'

/**
 * Simulador: conversa com a assistente usando o prompt e a base de conhecimento
 * reais, sem enviar nada pelo WhatsApp e sem gravar no CRM. Aceita um prompt em
 * rascunho para testar antes de salvar.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'eva/simular')
  const body = await readBody<{ historico?: MensagemHistorico[]; prompt?: string }>(event)

  const historico = (body?.historico ?? [])
    .filter(m => (m.autor === 'cliente' || m.autor === 'ia') && typeof m.conteudo === 'string')
    .map(m => ({ autor: m.autor, conteudo: m.conteudo.slice(0, 2000) }))
    .slice(-24)
  if (!historico.length || historico.at(-1)?.autor !== 'cliente') {
    throw createError({ statusCode: 400, message: 'Envie ao menos uma mensagem de cliente.' })
  }

  try {
    const admin = serverSupabaseServiceRole(event)
    const { openai, modelo } = criarOpenAI()
    const ultimas = historico.filter(m => m.autor === 'cliente').slice(-3).map(m => m.conteudo).join('\n')
    const [promptSalvo, conhecimento, escritorio] = await Promise.all([carregarPrompt(admin), buscarConhecimento(openai, admin, ultimas), carregarEscritorio(admin)])
    const prompt = body?.prompt?.trim() ? body.prompt.slice(0, 20000) : promptSalvo

    return await gerarResposta({ openai, modelo, promptEditavel: prompt, contato: null, historico, conhecimento, escritorio })
  } catch (e) {
    throwSanitizedInternalError('eva/simular', e, 'Não foi possível gerar a resposta. Verifique a chave da OpenAI.')
  }
})
