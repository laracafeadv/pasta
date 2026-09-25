import { TIPOS_ATIVIDADE } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/atividade')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const body = await readBody<{ tipo?: string; texto?: string }>(event)
  const texto = body?.texto?.trim()
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva a anotação.' })
  const tipo = TIPOS_ATIVIDADE.includes(body.tipo ?? '') ? body.tipo! : 'Anotação'

  await registrarAtividade(event, id, tipo, texto, userId)
  return { success: true }
})
