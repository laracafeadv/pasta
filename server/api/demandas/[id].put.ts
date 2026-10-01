import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparDemanda, sincronizarClienteComDemandas } from '../../utils/demandas'
import { registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'
import { TIPOS_DEMANDA } from '../../../shared/types/crm'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'casos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = limparDemanda(await readBody(event))
  delete d.contato_id
  const client = await serverSupabaseClient(event)
  const { data: antes } = await client.from('casos').select('status, responsavel_id, tipo, titulo').eq('id', id).maybeSingle()
  const anteriorStatus = antes?.status ?? null
  const { data, error } = await client.from('casos').update(d).eq('id', id).select().single()
  if (error) {
    throw createError({ statusCode: 500, message: 'Erro ao salvar a demanda.' })
  }
  if ('status' in d && anteriorStatus && anteriorStatus !== d.status) await registrarAtividade(event, data.contato_id, 'Sistema', `Demanda "${data.titulo}": ${anteriorStatus} → ${d.status}.`, userId, null, id)
  if ('responsavel_id' in d && (antes?.responsavel_id ?? null) !== d.responsavel_id) {
    const { data: quem } = d.responsavel_id ? await client.from('profiles').select('name').eq('id', d.responsavel_id).maybeSingle() : { data: null }
    await registrarAtividade(event, data.contato_id, 'Sistema', `Demanda "${data.titulo}": responsável ${quem?.name ? `passou a ser ${quem.name}` : 'removido'}.`, userId, null, id)
  }
  if ('tipo' in d && antes && antes.tipo !== d.tipo) await registrarAtividade(event, data.contato_id, 'Sistema', `Demanda "${data.titulo}": atuação ${TIPOS_DEMANDA[antes.tipo as keyof typeof TIPOS_DEMANDA]} → ${TIPOS_DEMANDA[data.tipo as keyof typeof TIPOS_DEMANDA]}.`, userId, null, id)
  if ('status' in d) await sincronizarClienteComDemandas(event, await serverSupabaseClient(event), data.contato_id, userId)
  await auditar(event, 'editou demanda', 'demanda', id, { campos: Object.keys(d) })
  return data
})
