import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'

/** Registra um gesto de relacionamento (plano de ação da carteira) e zera o "dias sem contato". */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/gesto')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const body = await readBody<{ texto?: string }>(event)
  const texto = body?.texto?.trim()
  if (!texto) throw createError({ statusCode: 400, message: 'Descreva o gesto.' })

  const client = await serverSupabaseClient(event)
  const { error } = await client.from('contatos').update({ ultimo_contato_em: new Date().toISOString() }).eq('id', id)
  if (error) {
    console.error('[crm/gesto] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao registrar o gesto.' })
  }
  await registrarAtividade(event, id, 'Relacionamento', texto.slice(0, 1000), userId)
  return { success: true }
})
