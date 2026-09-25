import { requireStaff } from '../../../../utils/security'
import { enviarPelaEquipe } from '../../../../utils/atendimento'

// Equipe responde a cliente pelo WhatsApp do escritório, de dentro do CRM.
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/whatsapp')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const body = await readBody<{ texto?: string }>(event)
  const texto = body?.texto?.trim()
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva a mensagem.' })
  if (texto.length > 4000) throw createError({ statusCode: 400, message: 'Mensagem longa demais.' })

  await enviarPelaEquipe(event, id, texto, userId)
  return { success: true }
})
