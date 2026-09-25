import { serverSupabaseClient } from '#supabase/server'
import { CAPACIDADES_PAGAMENTO, DECISOES_DIAGNOSTICO, DIAGNOSTICO_CAMPOS, VERIFICACOES_VIABILIDADE, pick } from '../../../../../shared/types/crm'
import { requireStaff } from '../../../../utils/security'
import { registrarAtividade } from '../../../../utils/crm'
import { auditar } from '../../../../utils/auditoria'

export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'crm/diagnostico/put')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const d = pick(await readBody<Record<string, any>>(event) ?? {}, DIAGNOSTICO_CAMPOS) as Record<string, any>

  for (const k of ['problema_relatado', 'causa_raiz', 'objetivo_cliente', 'riscos', 'descricao_em_jogo']) {
    if (k in d) d[k] = String(d[k] ?? '').trim().slice(0, 2000) || null
  }
  if ('porques' in d) d.porques = (Array.isArray(d.porques) ? d.porques : []).slice(0, 5).map((s: unknown) => String(s ?? '').trim().slice(0, 500))
  if ('verificacoes' in d) {
    const v = d.verificacoes ?? {}
    d.verificacoes = Object.fromEntries(VERIFICACOES_VIABILIDADE.filter(x => typeof v[x.chave] === 'boolean').map(x => [x.chave, v[x.chave]]))
  }
  if ('capacidade_pagamento' in d && d.capacidade_pagamento != null && !(d.capacidade_pagamento in CAPACIDADES_PAGAMENTO)) {
    throw createError({ statusCode: 400, message: 'Capacidade de pagamento inválida.' })
  }
  if ('decisao' in d && d.decisao != null && d.decisao !== '' && !(d.decisao in DECISOES_DIAGNOSTICO)) {
    throw createError({ statusCode: 400, message: 'Decisão inválida.' })
  }
  if (d.decisao === '') d.decisao = null
  if (d.capacidade_pagamento === '') d.capacidade_pagamento = null
  if ('valor_em_jogo' in d) {
    d.valor_em_jogo = d.valor_em_jogo === '' || d.valor_em_jogo == null ? null : Number(d.valor_em_jogo)
    if (d.valor_em_jogo != null && !(d.valor_em_jogo >= 0 && d.valor_em_jogo < 1e12)) throw createError({ statusCode: 400, message: 'Valor em jogo inválido.' })
  }

  const client = await serverSupabaseClient(event)
  const { data: antes } = await client.from('diagnosticos').select('decisao').eq('contato_id', id).maybeSingle()
  const { data, error } = await client
    .from('diagnosticos')
    .upsert({ ...d, contato_id: id, updated_at: new Date().toISOString(), updated_by: userId }, { onConflict: 'contato_id' })
    .select()
    .single()
  if (error) {
    console.error('[crm/diagnostico] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao salvar o diagnóstico.' })
  }
  if (d.decisao && d.decisao !== antes?.decisao) {
    await registrarAtividade(event, id, 'Sistema', `Diagnóstico: ${DECISOES_DIAGNOSTICO[d.decisao as keyof typeof DECISOES_DIAGNOSTICO].nome}.`, userId)
  }
  await auditar(event, 'alterou diagnóstico', 'contato', id, { campos: Object.keys(d) })
  return data
})
