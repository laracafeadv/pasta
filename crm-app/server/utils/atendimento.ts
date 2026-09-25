import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole } from '#supabase/server'
import { normalizarNome, normalizarTelefone, type Contato } from '../../shared/types/crm'
import { buscarConhecimento, carregarPrompt, criarOpenAI, gerarResposta, mesclarFicha, type MensagemHistorico } from './agente'
import { AVISO_LGPD } from './agentePrompt'
import { enviarTexto, type MensagemRecebida } from './whatsapp'
import { hojeBR as hoje, notificarEquipe, registrarAtividade } from './crm'

// Espera antes de responder: se a cliente mandar várias mensagens seguidas,
// só a última dispara a resposta (que já considera todas).
const ESPERA_MS = Number(process.env.WHATSAPP_ESPERA_MS ?? 6000)
const dormir = (ms: number) => new Promise(r => setTimeout(r, ms))

async function obterOuCriarContato(event: H3Event, admin: SupabaseClient, msg: MensagemRecebida): Promise<{ contato: Contato; novo: boolean }> {
  const telefone = normalizarTelefone(msg.telefone)
  const { data: existente } = await admin.from('contatos').select('*').eq('telefone', telefone).maybeSingle()
  if (existente) return { contato: existente as Contato, novo: false }

  const { data, error } = await admin
    .from('contatos')
    .insert({
      telefone,
      nome: msg.nomePerfil?.slice(0, 120) || null,
      origem: 'WhatsApp',
      etapa: 'novo',
      proxima_acao: 'Ler a triagem da assistente e retornar',
      proxima_data: hoje(),
    })
    .select()
    .single()

  if (error) {
    // Corrida: outra mensagem da mesma pessoa criou o contato ao mesmo tempo.
    if (error.code === '23505') {
      const { data: again } = await admin.from('contatos').select('*').eq('telefone', telefone).single()
      return { contato: again as Contato, novo: false }
    }
    throw error
  }

  await registrarAtividade(event, data.id, 'Sistema', 'Contato criado pelo WhatsApp.')
  await notificarEquipe(event, 'Novo contato no WhatsApp', `${data.nome || telefone} iniciou uma conversa.`, { contato_id: data.id })
  return { contato: data as Contato, novo: true }
}

async function gravarSaida(admin: SupabaseClient, contatoId: number, conteudo: string, waId: string | null, autor: 'ia' | 'equipe' = 'ia', autorId: string | null = null) {
  const { error } = await admin.from('mensagens_whatsapp').insert({
    contato_id: contatoId, direcao: 'saida', autor, autor_id: autorId, conteudo, wa_message_id: waId,
  })
  if (error) console.error('[atendimento] Erro ao gravar mensagem enviada:', error)
}

async function checarConflito(event: H3Event, admin: SupabaseClient, contato: Contato) {
  const nome = normalizarNome(contato.nome)
  const parte = normalizarNome(contato.parte_contraria)
  if (!nome && !parte) return
  const { data } = await admin.from('contatos').select('id, nome, parte_contraria').neq('id', contato.id).limit(2000)
  const achados = (data ?? []).filter(c =>
    (parte && normalizarNome(c.nome) === parte) || (nome && normalizarNome(c.parte_contraria) === nome))
  if (!achados.length) return
  const lista = achados.map(c => c.nome).join(', ')
  await registrarAtividade(event, contato.id, 'Sistema', `⚠ Possível conflito de interesses com: ${lista}. Verifique antes de aceitar o caso.`)
  await notificarEquipe(event, 'Possível conflito de interesses', `${contato.nome || contato.telefone} pode ter conflito com: ${lista}.`, { contato_id: contato.id }, 'warning')
}

/**
 * Processa uma mensagem recebida no WhatsApp: grava, e — se a assistente estiver
 * ativa para o contato — gera e envia a resposta, atualizando a ficha no CRM.
 */
export async function processarMensagem(event: H3Event, msg: MensagemRecebida) {
  const admin = serverSupabaseServiceRole(event)
  const { contato } = await obterOuCriarContato(event, admin, msg)

  // Grava a mensagem. wa_message_id é único: se a Meta reenviar o webhook, paramos aqui.
  const { data: gravada, error } = await admin
    .from('mensagens_whatsapp')
    .insert({ contato_id: contato.id, direcao: 'entrada', autor: 'cliente', conteudo: msg.texto, tipo: msg.tipo, wa_message_id: msg.waId })
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return // já processada
    throw error
  }
  await admin.from('contatos').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', contato.id)

  if (!contato.ia_ativa) {
    await notificarEquipe(event, 'Nova mensagem no WhatsApp', `${contato.nome || contato.telefone}: ${msg.texto.slice(0, 120)}`, { contato_id: contato.id })
    return
  }

  // Aguarda mensagens em sequência; só a mais recente segue adiante.
  await dormir(ESPERA_MS)
  const { data: ultima } = await admin
    .from('mensagens_whatsapp').select('id').eq('contato_id', contato.id).eq('direcao', 'entrada')
    .order('id', { ascending: false }).limit(1).single()
  if (ultima && ultima.id !== gravada.id) return

  // Relê o contato (a equipe pode ter assumido durante a espera).
  const { data: atual } = await admin.from('contatos').select('*').eq('id', contato.id).single()
  if (!atual?.ia_ativa) return

  try {
    // Aviso de privacidade na primeira interação (LGPD).
    if (!atual.consentimento_em) {
      const id = await enviarTexto(atual.telefone, AVISO_LGPD)
      await gravarSaida(admin, atual.id, AVISO_LGPD, id)
      await admin.from('contatos').update({ consentimento_em: new Date().toISOString() }).eq('id', atual.id)
    }

    const { data: msgs } = await admin
      .from('mensagens_whatsapp').select('autor, conteudo').eq('contato_id', atual.id)
      .order('id', { ascending: false }).limit(24)
    const historico = ((msgs ?? []) as MensagemHistorico[]).reverse()

    const { openai, modelo } = criarOpenAI()
    const ultimasDoCliente = historico.filter(m => m.autor === 'cliente').slice(-3).map(m => m.conteudo).join('\n')
    const [promptEditavel, conhecimento] = await Promise.all([
      carregarPrompt(admin),
      buscarConhecimento(openai, admin, ultimasDoCliente),
    ])

    const r = await gerarResposta({ openai, modelo, promptEditavel, contato: atual, historico, conhecimento })

    const waId = await enviarTexto(atual.telefone, r.resposta)
    await gravarSaida(admin, atual.id, r.resposta, waId)

    const atualizacao: Record<string, unknown> = { ...mesclarFicha(atual, r.ficha) }
    // Conversa começou: sai de "Novo contato" para "Em qualificação".
    if (atual.etapa === 'novo') atualizacao.etapa = 'qualificacao'
    if (r.transferir_para_humano) {
      const querAgendar = /agend|horár|consulta/i.test(r.motivo_transferencia ?? '')
      atualizacao.ia_ativa = false
      atualizacao.proxima_acao = (querAgendar
        ? `Enviar opções de horário da consulta${r.ficha.periodo_preferido ? ` (prefere ${r.ficha.periodo_preferido})` : ''} — /opcoes`
        : `Responder no WhatsApp: ${r.motivo_transferencia || 'pediu atendimento humano'}`).slice(0, 300)
      atualizacao.proxima_data = hoje()
      if (!atual.urgencia || r.ficha.urgencia === 'Alta') atualizacao.urgencia = r.ficha.urgencia ?? 'Média'
    }

    const { data: salvo } = await admin.from('contatos').update(atualizacao).eq('id', atual.id).select().single()

    const camposIA = Object.keys(atualizacao).filter(k => !['ia_ativa', 'proxima_acao', 'proxima_data', 'etapa'].includes(k))
    if (atualizacao.etapa === 'qualificacao') await registrarAtividade(event, atual.id, 'Sistema', 'Etapa: Novo contato → Em qualificação (Ana iniciou a triagem).')
    if (camposIA.length) await registrarAtividade(event, atual.id, 'Sistema', `Assistente atualizou a ficha: ${camposIA.join(', ')}.`)

    if (r.transferir_para_humano) {
      await registrarAtividade(event, atual.id, 'Sistema', `Assistente transferiu para a equipe: ${r.motivo_transferencia || 'pedido de atendimento humano'}.`)
      await notificarEquipe(event, 'Atendimento humano solicitado', `${salvo?.nome || atual.telefone}: ${r.motivo_transferencia || 'pediu para falar com a equipe'}.`, { contato_id: atual.id }, 'warning')
    }

    const mudouIdentidade = (r.ficha.parte_contraria && !atual.parte_contraria) || (r.ficha.nome && !atual.nome)
    if (salvo && mudouIdentidade) await checarConflito(event, admin, salvo as Contato)
  } catch (e) {
    console.error('[atendimento] Falha ao responder pela assistente:', e)
    await admin.from('contatos').update({ proxima_acao: 'Responder no WhatsApp (a assistente não conseguiu responder)', proxima_data: hoje() }).eq('id', atual.id)
    await notificarEquipe(event, 'A assistente não conseguiu responder', `Responda ${atual.nome || atual.telefone} manualmente pelo CRM.`, { contato_id: atual.id }, 'warning')
  }
}

/** Mensagem enviada pela equipe pelo CRM: envia, grava e pausa a IA no contato. */
export async function enviarPelaEquipe(event: H3Event, contatoId: number, texto: string, autorId: string) {
  const admin = serverSupabaseServiceRole(event)
  const { data: contato, error } = await admin.from('contatos').select('id, telefone, ia_ativa').eq('id', contatoId).single()
  if (error || !contato) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })

  let waId: string | null
  try {
    waId = await enviarTexto(contato.telefone, texto)
  } catch (e: any) {
    throw createError({ statusCode: 502, message: e?.message || 'Falha ao enviar pelo WhatsApp.' })
  }
  await gravarSaida(admin, contato.id, texto, waId, 'equipe', autorId)
  if (contato.ia_ativa) {
    await admin.from('contatos').update({ ia_ativa: false }).eq('id', contato.id)
    await registrarAtividade(event, contato.id, 'Sistema', 'Equipe respondeu pelo CRM; assistente pausada neste contato.', autorId)
  }
}
