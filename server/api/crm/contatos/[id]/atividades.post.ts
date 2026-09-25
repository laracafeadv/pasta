import { TIPOS_ATIVIDADE } from '../../../../../shared/types/crm'
import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/atividade')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const body = await readBody<{ tipo?: string; texto?: string; minutos?: number | string | null }>(event)
  const texto = body?.texto?.trim()
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva a anotação.' })
  const tipo = TIPOS_ATIVIDADE.includes(body.tipo ?? '') ? body.tipo! : 'Anotação'

  // Tempo gasto (opcional): alimenta a rentabilidade por cliente.
  const minutos = body.minutos == null || body.minutos === '' ? null : Number(body.minutos)
  if (minutos != null && (!Number.isInteger(minutos) || minutos < 0 || minutos > 1440)) {
    throw createError({ statusCode: 400, message: 'Tempo inválido (em minutos, até 1440).' })
  }
  await registrarAtividade(event, id, tipo, texto, userId, minutos)
  // Contato real com a cliente conta para a carteira ("dias sem contato").
  if (['Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Relacionamento'].includes(tipo)) {
    const client = await serverSupabaseClient(event)
    await client.from('contatos').update({ ultimo_contato_em: new Date().toISOString() }).eq('id', id)
  }
  return { success: true }
})
