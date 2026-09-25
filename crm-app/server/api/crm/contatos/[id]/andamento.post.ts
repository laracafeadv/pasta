import { serverSupabaseClient } from '#supabase/server'
import { ETAPAS, MOTIVOS_PERDA, chaveResponsavelEtapa, etapa } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'
import { auditar } from '../../../../utils/auditoria'

/**
 * Registrar andamento: conclui a próxima ação atual e obriga a decidir a seguinte
 * (ou encerrar o caso). É o laço central do método: nenhum caso aberto fica sem próximo passo.
 */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/andamento')
  const client = await serverSupabaseClient(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })

  const body = await readBody<{ resultado?: string; etapa: string; proxima_acao?: string; proxima_data?: string; motivo_perda?: string; consulta_em?: string | null; pagamento_confirmado?: boolean }>(event)
  const destino = ETAPAS.find(e => e.id === body?.etapa)
  if (!destino) throw createError({ statusCode: 400, message: 'Etapa inválida.' })
  if (destino.aberta && (!body.proxima_acao?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body.proxima_data ?? ''))) {
    throw createError({ statusCode: 400, message: 'Defina a próxima ação e a data.' })
  }
  const consultaEm = body.consulta_em ? new Date(body.consulta_em) : null
  if (consultaEm && Number.isNaN(consultaEm.getTime())) throw createError({ statusCode: 400, message: 'Data da consulta inválida.' })
  if (destino.id === 'perdido' && !MOTIVOS_PERDA.includes(body.motivo_perda ?? '')) {
    throw createError({ statusCode: 400, message: 'Informe o motivo da perda.' })
  }

  const { data: atual, error: e1 } = await client.from('contatos').select('etapa, proxima_acao').eq('id', id).single()
  if (e1 || !atual) throw createError({ statusCode: 404, message: 'Contato não encontrado.' })

  const resultado = body.resultado?.trim()
  if (atual.proxima_acao) await registrarAtividade(event, id, 'Andamento', `Concluído: ${atual.proxima_acao}${resultado ? `\n${resultado}` : ''}`, userId)
  else if (resultado) await registrarAtividade(event, id, 'Anotação', resultado, userId)
  if (consultaEm) {
    // A consulta entra na agenda do escritório (uma agenda só).
    const { data: c } = await client.from('contatos').select('nome').eq('id', id).single()
    await client.from('compromissos').insert({ tipo: 'consulta', titulo: `Consulta — ${c?.nome ?? 'cliente'}`, contato_id: id, inicio: consultaEm.toISOString(), responsavel_id: userId })
    await registrarAtividade(event, id, 'Sistema', `Consulta marcada para ${consultaEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}.`, userId)
  }
  // Checklist do quadro: pagamento confirmado antes de agendar → consulta lançada como paga.
  if (body.pagamento_confirmado && destino.id === 'agendado' && atual.etapa !== 'agendado') {
    const { data: ja } = await client.from('honorarios').select('id').eq('contato_id', id).eq('tipo', 'Consulta').limit(1)
    if (!ja?.length) {
      const { data: v } = await client.from('escritorio').select('valor').eq('chave', 'valor_consulta').maybeSingle()
      const valor = Number(String(v?.valor ?? '').replace(/[^\d,]/g, '').replace(',', '.')) || 0
      const { error: eh } = await client.from('honorarios').insert({ contato_id: id, tipo: 'Consulta', status: 'Pago', valor, descricao: 'Consulta estratégica', data_contratacao: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }), responsavel_id: userId })
      if (eh) console.error('[crm/andamento] Erro ao lançar a consulta:', eh)
    }
    await registrarAtividade(event, id, 'Sistema', 'Pagamento da consulta confirmado.', userId)
  }
  if (atual.etapa !== destino.id) {
    await registrarAtividade(event, id, 'Sistema', `Etapa: ${etapa(atual.etapa).nome} → ${destino.nome}${destino.id === 'perdido' ? ` (${body.motivo_perda})` : ''}`, userId)
  }

  // Fluxo da equipe: cada etapa pode ter uma pessoa responsável padrão (tela Equipe).
  let responsavel: string | null = null
  if (atual.etapa !== destino.id && destino.aberta) {
    const { data: r } = await client.from('escritorio').select('valor').eq('chave', chaveResponsavelEtapa(destino.id)).maybeSingle()
    responsavel = r?.valor || null
  }

  const { data, error } = await client
    .from('contatos')
    .update({
      ...(responsavel ? { responsavel_id: responsavel } : {}),
      etapa: destino.id,
      motivo_perda: destino.id === 'perdido' ? body.motivo_perda : null,
      proxima_acao: destino.aberta ? body.proxima_acao!.trim().slice(0, 300) : null,
      proxima_data: destino.aberta ? body.proxima_data : null,
      ...(consultaEm ? { consulta_em: consultaEm.toISOString() } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[crm/andamento] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao registrar andamento.' })
  }
  await auditar(event, 'registrou andamento', 'contato', id, { etapa: destino.id })
  return data
})
