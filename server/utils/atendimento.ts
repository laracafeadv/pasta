import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole } from '#supabase/server'
import { normalizarTelefone, type Contato } from '../../shared/types/crm'
import { enviarTexto, type MensagemRecebida } from './whatsapp'
import { processarMidia } from './midia'
import { hojeBR as hoje, notificarEquipe, registrarAtividade } from './crm'

async function obterOuCriarContato(event: H3Event, admin: SupabaseClient, msg: MensagemRecebida): Promise<Contato> {
  const telefone = normalizarTelefone(msg.telefone)
  const { data: existente } = await admin.from('contatos').select('*').eq('telefone', telefone).maybeSingle()
  if (existente) return existente as Contato

  const { data, error } = await admin
    .from('contatos')
    .insert({
      telefone,
      nome: msg.nomePerfil?.slice(0, 120) || null,
      origem: 'WhatsApp',
      etapa: 'novo',
      proxima_acao: 'Responder no WhatsApp',
      proxima_data: hoje(),
    })
    .select()
    .single()

  if (error) {
    // Corrida: outra mensagem da mesma pessoa criou o contato ao mesmo tempo.
    if (error.code === '23505') {
      const { data: again } = await admin.from('contatos').select('*').eq('telefone', telefone).single()
      return again as Contato
    }
    throw error
  }

  await registrarAtividade(event, data.id, 'Sistema', 'Contato criado pelo WhatsApp.')
  await notificarEquipe(event, 'Novo contato no WhatsApp', `${data.nome || telefone} iniciou uma conversa.`, { contato_id: data.id })
  return data as Contato
}

/**
 * Processa uma mensagem recebida no WhatsApp: cria o contato se for novo, guarda a mensagem
 * (e a mídia) e avisa a equipe. Quem responde é você, pelo CRM.
 */
export async function processarMensagem(event: H3Event, msg: MensagemRecebida): Promise<void> {
  const admin = serverSupabaseServiceRole(event)
  const contato = await obterOuCriarContato(event, admin, msg)

  // wa_message_id é único: se a Meta reenviar o webhook, paramos aqui.
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

  // Áudio, imagem ou documento: guarda para a equipe ouvir/ver.
  let textoMensagem = msg.texto
  if (msg.midia) textoMensagem = await processarMidia(admin, contato.id, gravada.id, msg)

  await notificarEquipe(event, 'Nova mensagem no WhatsApp', `${contato.nome || contato.telefone}: ${textoMensagem.slice(0, 120)}`, { contato_id: contato.id })
}

/** Mensagem enviada pela equipe pelo CRM: envia e grava na conversa. */
export async function enviarPelaEquipe(event: H3Event, contatoId: number, texto: string, autorId: string) {
  const admin = serverSupabaseServiceRole(event)
  const { data: contato, error } = await admin.from('contatos').select('id, telefone').eq('id', contatoId).single()
  if (error || !contato) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })

  let waId: string | null
  try {
    waId = await enviarTexto(contato.telefone, texto)
  } catch (e: any) {
    throw createError({ statusCode: 502, message: e?.message || 'Falha ao enviar pelo WhatsApp.' })
  }
  const { error: erroGravar } = await admin.from('mensagens_whatsapp').insert({
    contato_id: contato.id, direcao: 'saida', autor: 'equipe', autor_id: autorId, conteudo: texto, wa_message_id: waId,
  })
  if (erroGravar) console.error('[atendimento] Erro ao gravar mensagem enviada:', erroGravar)
}
