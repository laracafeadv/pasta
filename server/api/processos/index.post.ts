import { serverSupabaseClient } from '#supabase/server'
import { NATUREZAS_PROCESSO } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { limparProcesso, semearEtapas } from '../../utils/processos'
import { sincronizarAtuacao } from '../../utils/demandas'
import { registrarAtividade } from '../../utils/crm'
import { auditar } from '../../utils/auditoria'

/**
 * Registra o processo judicial OU o procedimento extrajudicial de uma demanda (a demanda é a mesma: não se duplica).
 * Extrajudicial: exige o tipo de procedimento e já cria as etapas formais.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'processos/create')
  const d = limparProcesso(await readBody(event), { criando: true })
  if (!d.caso_id) throw createError({ statusCode: 400, message: 'Escolha a demanda.' })
  if (!d.natureza) throw createError({ statusCode: 400, message: 'Escolha se é processo judicial ou procedimento extrajudicial.' })
  const client = await serverSupabaseClient(event)
  const { data: caso } = await client.from('casos').select('id, contato_id, titulo').eq('id', d.caso_id).single()
  if (!caso) throw createError({ statusCode: 404, message: 'Demanda não encontrada.' })
  const { data, error } = await client.from('processos').insert({ ...d, contato_id: caso.contato_id, responsavel_id: d.responsavel_id || userId }).select().single()
  if (error) {
    if (error.code === '23505') throw createError({ statusCode: 409, message: 'Já existe um processo com este número.' })
    console.error('[processos] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro ao registrar.' })
  }
  const etapas = data.natureza === 'extrajudicial' ? await semearEtapas(client, data.id, data.tipo_procedimento) : 0
  await sincronizarAtuacao(client, caso.id, event, userId)
  await registrarAtividade(event, caso.contato_id, 'Sistema', `${NATUREZAS_PROCESSO[data.natureza as keyof typeof NATUREZAS_PROCESSO]} registrado em "${caso.titulo}"${data.numero ? ` (${data.numero})` : ''}${etapas ? ` com ${etapas} etapas` : ''}.`, userId, null, caso.id, data.id)
  await auditar(event, 'registrou processo', 'processo', data.id, { caso_id: caso.id })
  return data
})
