import { toFile } from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { criarOpenAI } from './agente'
import { baixarMidia, type MensagemRecebida } from './whatsapp'

const EXTENSOES: Record<string, string> = {
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'application/pdf': 'pdf',
}

/**
 * Guarda a mídia recebida no bucket privado e, se for áudio, transcreve.
 * Devolve o texto que representa a mensagem na conversa (para a equipe e para a Ana).
 * Falhas não interrompem o atendimento: a mensagem fica registrada mesmo assim.
 */
export async function processarMidia(admin: SupabaseClient, contatoId: number, mensagemId: number, msg: MensagemRecebida): Promise<string> {
  const m = msg.midia!
  const legenda = m.legenda ? ` — "${m.legenda}"` : ''
  const atualizacao: Record<string, string | null> = { midia_tipo: m.mime || null, midia_nome: m.nome }
  let conteudo = msg.texto + legenda

  try {
    const { buffer, mime } = await baixarMidia(m.id)
    const tipoBase = (mime || m.mime).split(';')[0]!.trim()
    const ext = EXTENSOES[tipoBase] ?? (m.nome?.split('.').pop()?.toLowerCase() || 'bin')
    const caminho = `${contatoId}/${mensagemId}.${ext}`
    const { error } = await admin.storage.from('whatsapp').upload(caminho, buffer, { contentType: tipoBase, upsert: true })
    if (error) throw error
    atualizacao.midia_path = caminho
    atualizacao.midia_tipo = tipoBase

    if (msg.tipo === 'audio') {
      try {
        const { openai } = criarOpenAI()
        const r = await openai.audio.transcriptions.create({
          file: await toFile(buffer, `audio.${ext}`, { type: tipoBase }),
          model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
          language: 'pt',
        })
        const texto = (r.text ?? '').trim()
        if (texto) {
          atualizacao.transcricao = texto.slice(0, 8000)
          conteudo = `🎤 ${texto}`
        } else {
          conteudo = '[áudio não transcrito]'
        }
      } catch (e) {
        console.error('[midia] Falha na transcrição:', e)
        conteudo = '[áudio não transcrito]'
      }
    } else if (msg.tipo === 'document' && m.nome) {
      conteudo = `[o cliente enviou o documento "${m.nome}"]${legenda}`
    }
  } catch (e) {
    console.error('[midia] Falha ao guardar mídia:', e)
  }

  await admin.from('mensagens_whatsapp').update({ ...atualizacao, conteudo: conteudo.slice(0, 8000) }).eq('id', mensagemId)
  return conteudo
}
