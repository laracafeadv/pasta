import { serverSupabaseServiceRole } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { enviarMidiaAoDrive } from '../../../../utils/midia'
import { auditar } from '../../../../utils/auditoria'

/** "Enviar ao Drive": copia um arquivo recebido no WhatsApp para a pasta da cliente. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/mensagem/drive')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const admin = serverSupabaseServiceRole(event)
  const { data: m } = await admin.from('mensagens_whatsapp').select('contato_id, midia_path, midia_tipo, midia_nome, drive_url').eq('id', id).single()
  if (!m?.midia_path) throw createError({ statusCode: 404, message: 'Esta mensagem não tem arquivo.' })
  if (m.drive_url) return { url: m.drive_url }

  const { data: arquivo, error } = await admin.storage.from('whatsapp').download(m.midia_path)
  if (error || !arquivo) throw createError({ statusCode: 502, message: 'Não foi possível ler o arquivo guardado.' })
  const ext = m.midia_path.split('.').pop() || 'bin'
  const url = await enviarMidiaAoDrive(admin, m.contato_id, Buffer.from(await arquivo.arrayBuffer()), m.midia_tipo || 'application/octet-stream', ext, m.midia_nome)
  if (!url) throw createError({ statusCode: 502, message: 'O Google Drive não respondeu. Tente de novo em instantes.' })
  await admin.from('mensagens_whatsapp').update({ drive_url: url }).eq('id', id)
  await auditar(event, 'enviou arquivo ao Drive', 'contato', m.contato_id)
  return { url }
})
