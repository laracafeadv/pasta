import { CATEGORIAS_DOCUMENTO } from '../../shared/types/crm'

/** Valida e normaliza o corpo de um modelo de documento. */
export function limparModeloDocumento(body: any) {
  const nome = String(body?.nome ?? '').trim().slice(0, 150)
  const categoria = Object.keys(CATEGORIAS_DOCUMENTO).includes(body?.categoria) ? body.categoria : 'personalizado'
  const descricao = String(body?.descricao ?? '').trim().slice(0, 300) || null
  const conteudo = String(body?.conteudo ?? '').slice(0, 20000)
  if (!nome) throw createError({ statusCode: 400, message: 'Dê um nome para o modelo.' })
  if (!conteudo.trim()) throw createError({ statusCode: 400, message: 'Escreva o conteúdo do modelo.' })
  return { nome, categoria, descricao, conteudo }
}
