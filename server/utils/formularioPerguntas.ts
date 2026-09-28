import type { TipoPergunta } from '../../shared/types/crm'

const TIPOS: TipoPergunta[] = ['texto_curto', 'texto_longo', 'numero', 'data', 'email', 'telefone', 'sim_nao', 'selecao_unica', 'selecao_multipla']
const TIPOS_COM_OPCOES: TipoPergunta[] = ['selecao_unica', 'selecao_multipla']

/** Valida e normaliza o corpo de uma pergunta do banco de perguntas. */
export function limparPergunta(body: any) {
  const texto = String(body?.texto ?? '').trim().slice(0, 300)
  const tipo = TIPOS.includes(body?.tipo) ? (body.tipo as TipoPergunta) : 'texto_curto'
  const opcoesBrutas = Array.isArray(body?.opcoes) ? body.opcoes.map((o: unknown) => String(o).trim()).filter(Boolean) : []
  const opcoes = TIPOS_COM_OPCOES.includes(tipo) ? opcoesBrutas.slice(0, 20) : []
  if (!texto) throw createError({ statusCode: 400, message: 'Escreva o texto da pergunta.' })
  if (TIPOS_COM_OPCOES.includes(tipo) && opcoes.length < 2) throw createError({ statusCode: 400, message: 'Adicione pelo menos 2 opções para esse tipo de pergunta.' })
  return { texto, tipo, opcoes }
}
