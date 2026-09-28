import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { valorPorExtenso } from '../../shared/utils/extenso'
import { dataExtenso, v } from './pecas'
import type { Escritorio } from '../../shared/types/crm'

export interface DadosRecibo {
  nomeCliente: string
  documentoCliente: string | null
  valor: number
  referenteA: string
  formaPagamento: string | null
  numeroParcela: string | null
  data: string
}

/** Recibo simples, uma página, texto justificado. Sem dependência de navegador — funciona em serverless. */
export async function gerarReciboPdf(d: DadosRecibo, escritorio: Escritorio): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const fonteNormal = await doc.embedFont(StandardFonts.TimesRoman)
  const fonteNegrito = await doc.embedFont(StandardFonts.TimesRomanBold)
  const preto = rgb(0.15, 0.1, 0.08)
  const margem = 70
  let y = 780

  const titulo = 'RECIBO'
  const larguraTitulo = fonteNegrito.widthOfTextAtSize(titulo, 22)
  page.drawText(titulo, { x: (595.28 - larguraTitulo) / 2, y, size: 22, font: fonteNegrito, color: preto })
  y -= 60

  const valorExtenso = valorPorExtenso(d.valor)
  const valorFmt = d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const corpo = `Recebi de ${v(d.nomeCliente, 'CLIENTE')}, CPF/CNPJ ${v(d.documentoCliente, 'DOCUMENTO')}, a importância de `
    + `R$ ${valorFmt} (${valorExtenso}), referente a ${v(d.referenteA, 'descrição do serviço')}`
    + `${d.numeroParcela ? `, parcela ${d.numeroParcela}` : ''}.`

  const linhas = quebrarLinhas(corpo, fonteNormal, 12, 595.28 - margem * 2)
  for (const linha of linhas) {
    page.drawText(linha, { x: margem, y, size: 12, font: fonteNormal, color: preto, lineHeight: 18 })
    y -= 20
  }
  y -= 15
  page.drawText(`Forma de pagamento: ${v(d.formaPagamento, 'a combinar')}.`, { x: margem, y, size: 12, font: fonteNormal, color: preto })
  y -= 60

  const dataFmt = new Date(`${d.data}T12:00:00`)
  page.drawText(`${v(escritorio.cidade_foro, 'Cidade/UF')}, ${dataExtenso(dataFmt)}.`, { x: margem, y, size: 12, font: fonteNormal, color: preto })
  y -= 90

  page.drawLine({ start: { x: margem, y }, end: { x: 595.28 - margem, y }, thickness: 0.7, color: preto })
  y -= 18
  const nomeAssinatura = v(escritorio.advogada_nome, 'NOME DA ADVOGADA')
  const larguraNome = fonteNegrito.widthOfTextAtSize(nomeAssinatura, 12)
  page.drawText(nomeAssinatura, { x: (595.28 - larguraNome) / 2, y, size: 12, font: fonteNegrito, color: preto })
  y -= 16
  const linhaOab = `Advogada — OAB ${v(escritorio.oab, 'OAB')}`
  const larguraOab = fonteNormal.widthOfTextAtSize(linhaOab, 11)
  page.drawText(linhaOab, { x: (595.28 - larguraOab) / 2, y, size: 11, font: fonteNormal, color: preto })

  return doc.save()
}

function quebrarLinhas(texto: string, fonte: any, tamanho: number, larguraMax: number): string[] {
  const palavras = texto.split(' ')
  const linhas: string[] = []
  let atual = ''
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p
    if (fonte.widthOfTextAtSize(teste, tamanho) > larguraMax && atual) {
      linhas.push(atual)
      atual = p
    } else {
      atual = teste
    }
  }
  if (atual) linhas.push(atual)
  return linhas
}
