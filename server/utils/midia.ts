import type { SupabaseClient } from '@supabase/supabase-js'
import { baixarMidia, type MensagemRecebida } from './whatsapp'
import { driveConfigurado, enviarArquivo, garantirPastaCliente } from './drive'
import { NIVEIS_SIGILO, codigoCliente, nomeArquivoPadrao } from '../../shared/types/crm'

const EXTENSOES: Record<string, string> = {
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/amr': 'amr',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'application/pdf': 'pdf',
}

/**
 * Guarda a mídia recebida no bucket privado.
 * Devolve o texto que representa a mensagem na conversa (para a equipe).
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

    if (msg.tipo === 'document' && m.nome) {
      conteudo = `[o cliente enviou o documento "${m.nome}"]${legenda}`
    }

    // Documentos e fotos de CLIENTE vão direto para a pasta dela no Drive ("00 Recebidos pelo WhatsApp").
    // Lead sem pasta não gera pasta sozinho (minimização, LGPD): na conversa há o botão "Enviar ao Drive".
    if (msg.tipo !== 'audio' && msg.tipo !== 'sticker' && driveConfigurado()) {
      const { data: c } = await admin.from('contatos').select('etapa, drive_pasta_id').eq('id', contatoId).single()
      if (c && (c.drive_pasta_id || c.etapa === 'ativo')) {
        atualizacao.drive_url = await enviarMidiaAoDrive(admin, contatoId, buffer, tipoBase, ext, m.nome || m.legenda)
      }
    }
  } catch (e) {
    console.error('[midia] Falha ao guardar mídia:', e)
  }

  await admin.from('mensagens_whatsapp').update({ ...atualizacao, conteudo: conteudo.slice(0, 8000) }).eq('id', mensagemId)
  return conteudo
}

/** Envia um arquivo recebido para "00 Recebidos pelo WhatsApp" da cliente. Devolve o link, ou null se falhar. */
export async function enviarMidiaAoDrive(admin: SupabaseClient, contatoId: number, buffer: Buffer, mime: string, ext: string, descricao?: string | null): Promise<string | null> {
  try {
    const pasta = await garantirPastaCliente(admin, contatoId)
    const nome = nomeArquivoPadrao({
      data: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
      contatoId, tipo: 'Recebido', descricao: descricao?.replace(/\.[a-z0-9]{2,4}$/i, '') ?? null, extensao: ext,
    })
    const f = await enviarArquivo({ nome, mime, conteudo: buffer, pastaId: pasta.subpastas.recebidos, propriedades: { cliente: codigoCliente(contatoId), tipo: 'Recebido pelo WhatsApp', sigilo: NIVEIS_SIGILO.confidencial, origem: 'WhatsApp' } })
    return f.webViewLink
  } catch (e) {
    console.error('[midia] Falha ao enviar ao Drive:', e)
    return null
  }
}
