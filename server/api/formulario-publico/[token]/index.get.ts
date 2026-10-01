import { adminDe, envioPorToken, secoesDoEnvio } from '../../../utils/formularioEnvios'
import { carregarEscritorio } from '../../../utils/escritorio'

/**
 * Página pública do formulário. Devolve SÓ o necessário para a cliente: primeiro nome, nome da advogada, título, instruções,
 * perguntas e prazos. Nada de dados internos, outras pessoas, demandas ou financeiro.
 */
export default defineEventHandler(async (event) => {
  const admin = adminDe(event)
  const e = await envioPorToken(admin, getRouterParam(event, 'token'), { permitirRespondido: true })
  const esc = await carregarEscritorio(admin)
  if (e.status === 'gerado' || e.status === 'enviado') {
    await admin.from('formulario_envios').update({ status: 'visualizado', visualizado_em: new Date().toISOString() }).eq('id', e.id).in('status', ['gerado', 'enviado'])
  }
  setHeader(event, 'Cache-Control', 'no-store')
  const est = e.estrutura ?? {}
  return {
    primeiroNome: (e.contato?.nome ?? '').trim().split(/\s+/)[0] || null,
    advogada: esc.advogada_nome ? `Dra. ${esc.advogada_nome}` : 'o escritório',
    respondido: !!e.respondido_em,
    prazo_resposta: e.prazo_resposta, expira_em: e.expira_em,
    formulario: { nome: est.nome ?? 'Formulário', descricao: est.descricao ?? null, instrucoes: est.instrucoes ?? null, finalidade: est.finalidade ?? null, mensagem_final: est.mensagem_final ?? null, contexto: est.contexto ?? 'cliente' },
    secoes: secoesDoEnvio(e),
  }
})
