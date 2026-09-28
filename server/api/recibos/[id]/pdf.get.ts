import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../../utils/security'
import { carregarEscritorio } from '../../../utils/escritorio'
import { gerarReciboPdf } from '../../../utils/recibo'
import { nomeArquivoPadrao } from '../../../../shared/types/crm'

export default defineEventHandler(async (event) => {
  await requireStaff(event, 'recibos/pdf')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'ID inválido.' })
  const client = await serverSupabaseClient(event)
  const [{ data: recibo }, escritorio] = await Promise.all([
    client.from('recibos').select('*').eq('id', id).maybeSingle(),
    carregarEscritorio(client),
  ])
  if (!recibo) throw createError({ statusCode: 404, message: 'Recibo não encontrado.' })

  const pdf = await gerarReciboPdf({
    nomeCliente: recibo.nome_cliente, documentoCliente: recibo.documento_cliente, valor: Number(recibo.valor),
    referenteA: recibo.referente_a, formaPagamento: recibo.forma_pagamento, numeroParcela: recibo.numero_parcela, data: recibo.data,
  }, escritorio)

  const nomeArquivo = nomeArquivoPadrao({ data: recibo.data, contatoId: recibo.contato_id, tipo: 'Recibo', extensao: 'pdf' })
  setHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    'Cache-Control': 'private, no-store',
  })
  return Buffer.from(pdf)
})
