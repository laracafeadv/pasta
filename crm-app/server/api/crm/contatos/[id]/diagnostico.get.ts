import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import type { Diagnostico } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { carregarEscritorio } from '../../../../utils/escritorio'
import { calcularCustos } from '../../../../utils/financeiro'

export default defineEventHandler(async (event) => {
  const { role } = await requireStaff(event, 'crm/diagnostico')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)

  const [{ data: diag }, { data: contato }, { data: honor }] = await Promise.all([
    client.from('diagnosticos').select('*').eq('contato_id', id).maybeSingle(),
    client.from('contatos').select('demanda, dor, objetivo, resumo').eq('id', id).single(),
    client.from('honorarios').select('valor, status, created_at').eq('contato_id', id).neq('status', 'Cancelado').order('created_at', { ascending: false }).limit(1),
  ])

  const d: Diagnostico = diag ?? {
    contato_id: id,
    // Ponto de partida: o que a Ana ouviu na triagem.
    problema_relatado: contato?.dor ?? null,
    porques: [], causa_raiz: null,
    objetivo_cliente: contato?.objetivo ?? null,
    verificacoes: {}, riscos: null, capacidade_pagamento: null,
    valor_em_jogo: null, descricao_em_jogo: null, decisao: null,
  }
  d.honorario_proposto = honor?.[0] ? Number(honor[0].valor) : null
  // Preço mínimo (custo da hora) é informação de gestão: só a administração vê.
  if (role === 'admin' && contato?.demanda) {
    const admin = serverSupabaseServiceRole(event)
    const custos = await calcularCustos(admin, await carregarEscritorio(admin))
    const p = custos.precos.find(x => x.demanda === contato.demanda)
    d.preco_minimo = custos.custoMensal > 0 && p ? p.minimo : null
  }
  return d
})
