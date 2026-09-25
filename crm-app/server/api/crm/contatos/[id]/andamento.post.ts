import { serverSupabaseClient } from '#supabase/server'
import { ETAPAS, MOTIVOS_PERDA, etapa } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'

/**
 * Registrar andamento: conclui a próxima ação atual e obriga a decidir a seguinte
 * (ou encerrar o caso). É o laço central do método: nenhum caso aberto fica sem próximo passo.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/andamento')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const body = await readBody<{ resultado?: string; etapa: string; proxima_acao?: string; proxima_data?: string; motivo_perda?: string }>(event)
  const destino = ETAPAS.find(e => e.id === body?.etapa)
  if (!destino) throw createError({ statusCode: 400, message: 'Etapa inválida.' })
  if (destino.aberta && (!body.proxima_acao?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.proxima_data ?? ''))) {
    throw createError({ statusCode: 400, message: 'Defina a próxima ação e a data.' })
  }
  if (destino.id === 'perdido' && !MOTIVOS_PERDA.includes(body.motivo_perda ?? '')) {
    throw createError({ statusCode: 400, message: 'Informe o motivo da perda.' })
  }

  const { data: atual, error: e1 } = await client.from('contatos').select('etapa, proxima_acao').eq('id', id).single()
  if (e1 || !atual) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })

  const resultado = body.resultado?.trim()
  if (atual.proxima_acao) await registrarAtividade(event, id, 'Andamento', `Concluído: ${atual.proxima_acao}${resultado ? `\n${resultado}` : ''}`, userId)
  else if (resultado) await registrarAtividade(event, id, 'Anotação', resultado, userId)
  if (atual.etapa !== destino.id) {
    await registrarAtividade(event, id, 'Sistema', `Etapa: ${etapa(atual.etapa).nome} → ${destino.nome}${destino.id === 'perdido' ? ` (${body.motivo_perda})` : ''}`, userId)
  }

  const { data, error } = await client
    .from('contatos')
    .update({
      etapa: destino.id,
      motivo_perda: destino.id === 'perdido' ? body.motivo_perda : null,
      proxima_acao: destino.aberta ? body.proxima_acao!.trim().slice(0, 300) : null,
      proxima_data: destino.aberta ? body.proxima_data : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[crm/andamento] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao registrar andamento.' })
  }
  return data
})
