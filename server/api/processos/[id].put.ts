import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { limparProcesso, reabrirProcesso, semearEtapas } from '../../utils/processos'
import { sincronizarAtuacao } from '../../utils/demandas'
import { registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/update')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const { data: atual } = await client.from('processos').select('natureza, caso_id, contato_id, status, fase, numero').eq('id', id).single()
  if (!atual) throw createError({ statusCode: 404, message: 'Não encontrado.' })
  const body = await readBody(event)
  // A natureza não muda: judicial e extrajudicial têm fluxos próprios (para mudar, registre o outro na mesma demanda).
  if (body?.natureza && body.natureza !== atual.natureza) throw createError({ statusCode: 400, message: 'Não dá para trocar a natureza. Registre o processo judicial (ou o procedimento) na mesma demanda: ela não é duplicada.' })
  const reabrir = body?.status === 'ativo' && atual.status === 'encerrado'
  const d = limparProcesso({ ...body, natureza: atual.natureza, status: reabrir ? undefined : body?.status })
  delete d.caso_id
  delete d.natureza
  const { data, error } = await client.from('processos').update({ ...d, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um processo com este número.' })
    throw createError({ statusCode: 500, message: 'Erro ao salvar.' })
  }
  if (reabrir) await reabrirProcesso(event, client, id, userId)
  if (atual.natureza === 'extrajudicial' && d.tipo_procedimento) await semearEtapas(client, id, d.tipo_procedimento)
  if (atual.natureza === 'judicial' && d.fase && d.fase !== atual.fase) await registrarAtividade(event, atual.contato_id, 'Sistema', `Processo ${atual.numero ?? ''} — fase: ${atual.fase ?? '—'} → ${d.fase}.`, userId, null, atual.caso_id, id)
  await sincronizarAtuacao(client, atual.caso_id, event, userId)
  await auditar(event, 'editou processo', 'processo', id, { campos: Object.keys(d) })
  return data
})
