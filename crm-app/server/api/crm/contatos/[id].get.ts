import { serverSupabaseClient } from '#supabase/server'
import type { Atividade, Contato, Documento, Honorario, MensagemWhatsapp } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'

// Visão 360 do contato: ficha, honorários, conversa de WhatsApp e atividades.
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/detail')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const [contato, honorarios, mensagens, atividades, documentos] = await Promise.all([
    client.from('contatos').select('*').eq('id', id).single(),
    client.from('honorarios').select('*').eq('contato_id', id).order('created_at', { ascending: false }),
    client.from('mensagens_whatsapp').select('*').eq('contato_id', id).order('id', { ascending: false }).limit(300),
    client.from('atividades').select('*, autor:profiles(name)').eq('contato_id', id).order('created_at', { ascending: false }).limit(200),
    client.from('documentos').select('*').eq('contato_id', id).order('ordem'),
  ])

  if (contato.error || !contato.data) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })
  for (const r of [honorarios, mensagens, atividades, documentos]) if (r.error) console.error('[crm/detail] Erro parcial:', r.error)

  return {
    contato: contato.data as Contato,
    honorarios: (honorarios.data ?? []) as Honorario[],
    mensagens: ((mensagens.data ?? []) as MensagemWhatsapp[]).reverse(),
    atividades: (atividades.data ?? []) as Atividade[],
    documentos: (documentos.data ?? []) as Documento[],
  }
})
