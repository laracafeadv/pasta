import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'
import { normalizarTelefone } from '../../shared/types/crm'
import type { EcoEnviado } from './whatsapp'

/**
 * Registra no CRM uma mensagem enviada pelo aplicativo do celular.
 * Só para quem já é contato: conversas pessoais do número não entram no sistema.
 */
export async function registrarEco(event: H3Event, eco: EcoEnviado) {
  const admin = serverSupabaseServiceRole(event)
  const { data: contato } = await admin.from('contatos').select('id').eq('telefone', normalizarTelefone(eco.telefone)).maybeSingle()
  if (!contato) return
  const { error } = await admin.from('mensagens_whatsapp').insert({
    contato_id: contato.id, direcao: 'saida', autor: 'equipe', conteudo: eco.texto, tipo: 'texto', wa_message_id: eco.waId,
  })
  if (error && error.code !== '23505') console.error('[whatsapp/eco] Erro:', error)
  if (error) return
  await admin.from('contatos').update({ ultimo_contato_em: new Date(eco.timestamp).toISOString() }).eq('id', contato.id)
}
