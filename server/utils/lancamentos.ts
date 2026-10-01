import { CATEGORIAS_LANCAMENTO, LANCAMENTO_CAMPOS, pick } from '../../shared/types/crm'

export function limparLancamento(body: Record<string, any>, parcial = false) {
  const d = pick(body ?? {}, LANCAMENTO_CAMPOS) as Record<string, any>
  for (const [k, v] of Object.entries(d)) if (v === '') d[k] = null
  if (!parcial || 'tipo' in d) {
    if (d.tipo !== 'receber' && d.tipo !== 'pagar') throw createError({ statusCode: 400, message: 'Tipo inválido.' })
  }
  if (!parcial || 'descricao' in d) {
    d.descricao = String(d.descricao ?? '').trim().slice(0, 200)
    if (!d.descricao) throw createError({ statusCode: 400, message: 'Informe a descrição.' })
  }
  if (!parcial || 'valor' in d) {
    d.valor = Number(d.valor)
    if (!(d.valor > 0) || d.valor > 1e9) throw createError({ statusCode: 400, message: 'Valor inválido.' })
  }
  if (!parcial || 'vencimento' in d) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.vencimento ?? ''))) throw createError({ statusCode: 400, message: 'Informe o vencimento.' })
  }
  if (d.pago_em != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.pago_em))) throw createError({ statusCode: 400, message: 'Data de pagamento inválida.' })
  if ('categoria' in d || !parcial) {
    const lista = (CATEGORIAS_LANCAMENTO as Record<string, readonly string[]>)[d.tipo ?? 'pagar'] ?? []
    d.categoria = lista.includes(d.categoria) ? d.categoria : 'Outros'
  }
  if ('recorrente' in d) d.recorrente = d.recorrente === true
  for (const k of ['contato_id', 'caso_id']) if (d[k] != null) d[k] = Number(d[k]) || null
  return d
}
