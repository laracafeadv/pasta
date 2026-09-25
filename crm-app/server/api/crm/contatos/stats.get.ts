import { serverSupabaseClient } from '#supabase/server'
import { AREAS, ETAPAS, ETAPAS_GANHAS, MOTIVOS_PERDA, ORIGENS, STATUS_RECEITA } from '../../../../shared/types/crm'
import { requireStaff } from '../../../utils/security'
import { hojeBR } from '../../../utils/crm'

interface Linha { chave: string; total: number; ganhos: number; decididos: number }

// Indicadores do funil. `dias` = janela de criação dos contatos (0 = todo o período).
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'crm/stats')
  const client = await serverSupabaseClient(event)
  const dias = Math.max(0, Number(getQuery(event).dias ?? 90) || 0)
  const desde = dias ? new Date(Date.now() - dias * 864e5).toISOString() : null
  const hoje = hojeBR()

  const contatosQ = client.from('contatos').select('etapa, origem, area, motivo_perda, urgencia, proxima_acao, proxima_data, created_at')
  let honorariosQ = client.from('honorarios').select('valor, status, created_at')
  if (desde) honorariosQ = honorariosQ.gte('created_at', desde)

  const [{ data: contatos, error: e1 }, { data: honorarios, error: e2 }] = await Promise.all([contatosQ, honorariosQ])
  if (e1 || e2) {
    console.error('[crm/stats] Erro:', e1 || e2)
    throw createError({ statusCode: 500, message: 'Erro interno ao calcular indicadores.' })
  }

  const todos = contatos ?? []
  const periodo = desde ? todos.filter(c => c.created_at >= desde) : todos
  const aberto = (c: { etapa: string }) => ETAPAS.find(e => e.id === c.etapa)?.aberta ?? true
  const ganho = (c: { etapa: string }) => (ETAPAS_GANHAS as string[]).includes(c.etapa)

  const ganhos = periodo.filter(ganho).length
  const perdidos = periodo.filter(c => c.etapa === 'perdido').length
  const abertos = todos.filter(aberto)
  const travados = abertos.filter(c => !c.proxima_acao || !c.proxima_data || c.proxima_data < hoje).length

  const receita = (honorarios ?? []).filter(h => STATUS_RECEITA.includes(h.status)).reduce((a, h) => a + Number(h.valor || 0), 0)
  const emProposta = (honorarios ?? []).filter(h => h.status === 'Proposta').reduce((a, h) => a + Number(h.valor || 0), 0)

  const agrupar = (campo: 'origem' | 'area', chaves: string[]): Linha[] =>
    [...chaves, null].map((chave) => {
      const g = periodo.filter(c => (chave === null ? !c[campo] || !chaves.includes(c[campo]) : c[campo] === chave))
      const w = g.filter(ganho).length
      return { chave: chave ?? 'Não informado', total: g.length, ganhos: w, decididos: w + g.filter(c => c.etapa === 'perdido').length }
    }).filter(l => l.total > 0).sort((a, b) => b.total - a.total)

  return {
    novos: periodo.length,
    taxaFechamento: ganhos + perdidos ? Math.round((ganhos / (ganhos + perdidos)) * 100) : null,
    ganhos,
    decididos: ganhos + perdidos,
    urgentesAbertos: abertos.filter(c => c.urgencia === 'Alta').length,
    travados,
    receita,
    emProposta,
    porEtapa: ETAPAS.filter(e => e.aberta).map(e => ({ chave: e.nome, total: todos.filter(c => c.etapa === e.id).length })),
    porOrigem: agrupar('origem', ORIGENS),
    porArea: agrupar('area', Object.keys(AREAS)),
    motivosPerda: MOTIVOS_PERDA
      .map(m => ({ chave: m, total: periodo.filter(c => c.etapa === 'perdido' && c.motivo_perda === m).length }))
      .filter(l => l.total > 0)
      .sort((a, b) => b.total - a.total),
  }
})
