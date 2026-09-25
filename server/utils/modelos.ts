import { pick } from '../../shared/types/crm'

export function limparModelo(body: Record<string, any>) {
  const d = pick(body ?? {}, ['categoria', 'titulo', 'atalho', 'texto', 'ordem', 'ativo']) as Record<string, any>
  if ('atalho' in d) {
    d.atalho = '/' + String(d.atalho).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/^\/+/, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '')
    if (!/^\/[a-z0-9-]{2,40}$/.test(d.atalho)) throw createError({ statusCode: 400, message: 'Atalho inválido (use letras, números e hífen).' })
  }
  for (const k of ['categoria', 'titulo', 'texto']) {
    if (k in d && !String(d[k] ?? '').trim()) throw createError({ statusCode: 400, message: `Preencha ${k}.` })
    if (k in d) d[k] = String(d[k]).trim().slice(0, k === 'texto' ? 4000 : 120)
  }
  if ('ordem' in d) d.ordem = Number(d.ordem) || 0
  if ('ativo' in d) d.ativo = Boolean(d.ativo)
  return d
}
