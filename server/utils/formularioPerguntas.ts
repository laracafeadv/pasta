import type { TipoPergunta } from '../../shared/types/crm'
import { PROCEDIMENTOS } from '../../shared/data/checklist'

const TIPOS: TipoPergunta[] = ['texto_curto', 'texto_longo', 'numero', 'data', 'email', 'telefone', 'sim_nao', 'selecao_unica', 'selecao_multipla', 'checklist']
export const TIPOS_COM_OPCOES: TipoPergunta[] = ['selecao_unica', 'selecao_multipla', 'checklist']

/** Valida e normaliza o corpo de uma pergunta do banco de perguntas. */
export function limparPergunta(body: any) {
  const texto = String(body?.texto ?? '').trim().slice(0, 300)
  const tipo = TIPOS.includes(body?.tipo) ? (body.tipo as TipoPergunta) : 'texto_curto'
  const opcoesBrutas = Array.isArray(body?.opcoes) ? body.opcoes.map((o: unknown) => String(o).trim()).filter(Boolean) : []
  const opcoes = TIPOS_COM_OPCOES.includes(tipo) ? opcoesBrutas.slice(0, 20) : []
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva o texto da pergunta.' })
  if (TIPOS_COM_OPCOES.includes(tipo) && opcoes.length < 2) throw createError({ statusCode: 400, message: 'Adicione pelo menos 2 opções (ou itens) para esse tipo de pergunta.' })
  const secao = String(body?.secao ?? '').trim().slice(0, 60) || 'Geral'
  const ajuda = String(body?.ajuda ?? '').trim().slice(0, 300) || null
  const escopo = body?.escopo === 'demanda' ? 'demanda' : 'cliente'
  const validos = new Set(PROCEDIMENTOS.map(p => p.valor))
  const procedimentos = escopo === 'demanda' && Array.isArray(body?.procedimentos) ? [...new Set<string>(body.procedimentos.map(String).filter((v: string) => validos.has(v)))] : []
  return { texto, tipo, opcoes, secao, ajuda, escopo, procedimentos }
}

/**
 * Normaliza a resposta de um cliente conforme o tipo da pergunta. Uma só regra, usada pela ficha
 * e pelo formulário público, para que os dois gravem o mesmo formato.
 */
export function normalizarRespostaCliente(tipo: TipoPergunta, opcoes: string[], v: unknown): string | string[] | null {
  const texto = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '') || null
  if (tipo === 'selecao_multipla' || tipo === 'checklist') {
    const lista = Array.isArray(v) ? v.map(x => String(x).trim()) : []
    const validas = opcoes.filter(o => lista.includes(o)) // mantém a ordem das opções
    return validas.length ? validas : null
  }
  const t = texto(Array.isArray(v) ? v[0] : v, tipo === 'texto_longo' ? 4000 : 500)
  if (t == null) return null
  if (tipo === 'selecao_unica') { if (!opcoes.includes(t)) throw createError({ statusCode: 400, message: 'Opção inválida.' }); return t }
  if (tipo === 'sim_nao') { if (t !== 'Sim' && t !== 'Não') throw createError({ statusCode: 400, message: 'Responda Sim ou Não.' }); return t }
  if (tipo === 'numero') { if (!Number.isFinite(Number(t.replace(',', '.')))) throw createError({ statusCode: 400, message: 'Informe um número.' }); return t }
  if (tipo === 'data') { if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw createError({ statusCode: 400, message: 'Data inválida.' }); return t }
  if (tipo === 'email') { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw createError({ statusCode: 400, message: 'E-mail inválido.' }); return t }
  return t
}
