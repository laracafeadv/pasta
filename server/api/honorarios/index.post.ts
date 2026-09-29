import { serverSupabaseClient } from '#supabase/server'
import { brlServidor } from '../../utils/formato'
import { requireStaff } from '../../utils/security'
import { registrarAtividade } from '../../utils/crm'
import { conferirDemanda, limparHonorario } from '../../utils/honorarios'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'honorarios/create')
  const client = await serverSupabaseClient(event)
  const data = limparHonorario(await readBody(event))
  if (!data.contato_id) throw createError({ statusCode: 400, message: 'Escolha o contato.' })

  await conferirDemanda(client, data.contato_id, data.caso_id)
  const { data: created, error } = await client.from('honorarios').insert([{ responsavel_id: userId, ...data }]).select().single()
  if (error) {
    console.error('[honorarios] Erro ao criar:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao registrar honorário.' })
  }
  await registrarAtividade(event, created.contato_id, 'Sistema', `Honorário registrado: ${brlServidor(created.valor)} (${created.tipo}, ${created.status}).`, userId, null, created.caso_id ?? null)
  await auditar(event, 'registrou honorário', 'honorario', created.id, { contato_id: created.contato_id })
  return created
})
