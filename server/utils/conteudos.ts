import { FORMATOS_CONTEUDO, PLATAFORMAS_CONTEUDO, STATUS_CONTEUDO } from '../../shared/types/crm'

/** Lista branca dos campos de um conteúdo; só aplica o que veio no corpo (serve para criar e para editar). */
export function limparConteudo(b: Record<string, any>, criando: boolean) {
  const d: Record<string, unknown> = {}
  const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max) || null
  if (criando || 'titulo' in b) {
    const t = txt(b.titulo, 200)
    if (!t) throw createError({ statusCode: 400, message: 'Dê um título para o conteúdo.' })
    d.titulo = t
  }
  if ('tema' in b) d.tema = txt(b.tema, 200)
  if ('legenda' in b) d.legenda = txt(b.legenda, 5000)
  if ('cta' in b) d.cta = txt(b.cta, 300)
  if ('data_publicacao' in b) d.data_publicacao = /^\d{4}-\d{2}-\d{2}$/.test(String(b.data_publicacao)) ? b.data_publicacao : null
  if ('formato' in b && b.formato in FORMATOS_CONTEUDO) d.formato = b.formato
  if ('plataforma' in b && b.plataforma in PLATAFORMAS_CONTEUDO) d.plataforma = b.plataforma
  if ('status' in b && b.status in STATUS_CONTEUDO) d.status = b.status
  return d
}
