import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/security'
import { auditar } from '../../utils/auditoria'
import { hojeBR } from '../../utils/crm'

/** Honorário contratado → parcelas em "contas a receber", uma por mês. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'financeiro/parcelas')
  const { honorario_id } = await readBody<{ honorario_id?: number }>(event)
  const admin = serverSupabaseServiceRole(event)
  const { data: h } = await admin.from('honorarios').select('*, contato:contatos(nome)').eq('id', Number(honorario_id)).maybeSingle()
  if (!h) throw createError({ statusCode: 404, message: 'Honorário não encontrado.' })
  if (!['Contratado', 'Pago'].includes(h.status)) throw createError({ statusCode: 400, message: 'Gere parcelas só de honorários contratados.' })
  const { data: existentes } = await admin.from('lancamentos').select('id').eq('honorario_id', h.id).limit(1)
  if (existentes?.length) throw createError({ statusCode: 409, message: 'As parcelas deste honorário já foram geradas.' })

  const n = Math.max(1, Number(h.parcelas) || 1)
  const total = Math.round(Number(h.valor) * 100)
  const base = Math.floor(total / n)
  const inicio = h.data_contratacao || hojeBR()
  const [a, m, d] = inicio.split('-').map(Number)
  const linhas = Array.from({ length: n }, (_, i) => {
    const dt = new Date(Date.UTC(a!, m! - 1 + i, Math.min(d!, 28)))
    return {
      tipo: 'receber',
      descricao: `${h.tipo} — ${h.contato?.nome ?? 'cliente'}${n > 1 ? ` (${i + 1}/${n})` : ''}`,
      categoria: h.tipo === 'Êxito' ? 'Êxito' : h.tipo === 'Consulta' ? 'Consulta' : 'Honorários',
      valor: (i === n - 1 ? total - base * (n - 1) : base) / 100,
      vencimento: dt.toISOString().slice(0, 10),
      pago_em: h.status === 'Pago' ? dt.toISOString().slice(0, 10) : null,
      contato_id: h.contato_id,
      caso_id: h.caso_id ?? null,
      honorario_id: h.id,
    }
  })
  // Em camadas: depois do arranque, as mensalidades (a partir do mês seguinte).
  if (h.tipo === 'Em camadas' && Number(h.valor_mensal) > 0 && Number(h.meses) > 0) {
    for (let i = 0; i < Number(h.meses); i++) {
      const dt = new Date(Date.UTC(a!, m! + n + i, Math.min(d!, 28)))
      linhas.push({
        tipo: 'receber', descricao: `Mensalidade — ${h.contato?.nome ?? 'cliente'} (${i + 1}/${h.meses})`, categoria: 'Honorários',
        valor: Number(h.valor_mensal), vencimento: dt.toISOString().slice(0, 10), pago_em: null, contato_id: h.contato_id, caso_id: h.caso_id ?? null, honorario_id: h.id,
      })
    }
  }
  const { error } = await admin.from('lancamentos').insert(linhas)
  if (error) {
    console.error('[financeiro/parcelas] Erro:', error)
    throw createError({ statusCode: 500, message: 'Erro interno ao gerar as parcelas.' })
  }
  await auditar(event, 'gerou parcelas', 'honorario', h.id, { parcelas: n })
  return { parcelas: n }
})
