import { serverSupabaseClient } from '#supabase/server'
import { brlServidor } from '../../utils/formato'
import { requireStaff } from '../../utils/security'
import { registrarAtividade } from '../../utils/crm'
import { conferirDemanda, limparHonorario } from '../../utils/honorarios'
import { sincronizarCicloPorHonorario } from '../../utils/ciclo'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'honorarios/update')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const data = limparHonorario(await readBody(event))
  const { data: anterior } = await client.from('honorarios').select('status, contato_id').eq('id', id).single()
  if (anterior) await conferirDemanda(client, anterior.contato_id, data.caso_id)

  const { data: updated, error } = await client.from('honorarios').update(data).eq('id', id).select().single()
  if (error) {
    console.error('[honorarios] Erro ao atualizar:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao atualizar honorário.' })
  }
  await sincronizarCicloPorHonorario(event, client, updated, userId)
  if (anterior && data.status && anterior.status !== data.status) {
    await registrarAtividade(event, updated.contato_id, 'Sistema', `Honorário de ${brlServidor(updated.valor)}: ${anterior.status} → ${data.status}.`, userId)
  }
  await auditar(event, 'editou honorário', 'honorario', id, { campos: Object.keys(data) })
  return updated
})
