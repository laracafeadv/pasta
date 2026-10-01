// Regras do construtor de formulários, compartilhadas por: construtor (visualização), página pública de
// preenchimento, ficha do cliente/demanda e servidor (validação). Uma só definição de tipos, operadores e
// lógica condicional — nada disso é espalhado por telas.

export type TipoPergunta = 'texto_curto' | 'texto_longo' | 'numero' | 'data' | 'email' | 'telefone' | 'sim_nao'
  | 'selecao_unica' | 'lista_suspensa' | 'selecao_multipla' | 'checklist'

export interface DefTipo {
  valor: TipoPergunta
  nome: string
  grupo: 'Texto' | 'Escolha' | 'Dados'
  icone: string
  comOpcoes: boolean
  /** Uma escolha só (radio/lista) ou várias (caixas). */
  multipla: boolean
  /** Só acompanhamento interno: não é perguntado ao cliente. */
  interno?: boolean
  dica: string
}

export const TIPOS_PERGUNTA: DefTipo[] = [
  { valor: 'texto_curto', nome: 'Resposta curta', grupo: 'Texto', icone: 'ph:text-aa-bold', comOpcoes: false, multipla: false, dica: 'Nome, profissão, cidade…' },
  { valor: 'texto_longo', nome: 'Texto longo', grupo: 'Texto', icone: 'ph:text-align-left-bold', comOpcoes: false, multipla: false, dica: 'Relato, descrição da situação' },
  { valor: 'numero', nome: 'Número', grupo: 'Dados', icone: 'ph:hash-bold', comOpcoes: false, multipla: false, dica: 'Quantidade de filhos, valores' },
  { valor: 'data', nome: 'Data', grupo: 'Dados', icone: 'ph:calendar-blank-bold', comOpcoes: false, multipla: false, dica: 'Data de nascimento, do casamento' },
  { valor: 'email', nome: 'E-mail', grupo: 'Dados', icone: 'ph:envelope-simple-bold', comOpcoes: false, multipla: false, dica: 'Valida o formato do e-mail' },
  { valor: 'telefone', nome: 'Telefone', grupo: 'Dados', icone: 'ph:phone-bold', comOpcoes: false, multipla: false, dica: 'Telefone ou WhatsApp' },
  { valor: 'sim_nao', nome: 'Sim / Não', grupo: 'Escolha', icone: 'ph:toggle-left-bold', comOpcoes: false, multipla: false, dica: 'Pergunta direta; ótima para condicionais' },
  { valor: 'selecao_unica', nome: 'Seleção única', grupo: 'Escolha', icone: 'ph:radio-button-bold', comOpcoes: true, multipla: false, dica: 'Escolhe uma alternativa' },
  { valor: 'lista_suspensa', nome: 'Lista suspensa', grupo: 'Escolha', icone: 'ph:caret-circle-down-bold', comOpcoes: true, multipla: false, dica: 'Uma escolha, para muitas opções' },
  { valor: 'selecao_multipla', nome: 'Múltipla seleção', grupo: 'Escolha', icone: 'ph:check-square-bold', comOpcoes: true, multipla: true, dica: 'Marca várias (ex.: quais bens possui)' },
  { valor: 'checklist', nome: 'Checklist interno', grupo: 'Escolha', icone: 'ph:list-checks-bold', comOpcoes: true, multipla: true, interno: true, dica: 'Acompanhamento do escritório (o que já foi feito); não vai para o cliente' },
]
export const TIPO = (t: string) => TIPOS_PERGUNTA.find(x => x.valor === t)
export const tipoComOpcoes = (t: string) => !!TIPO(t)?.comOpcoes
export const tipoMultiplo = (t: string) => !!TIPO(t)?.multipla
export const tipoInterno = (t: string) => !!TIPO(t)?.interno

// ─── Contexto do formulário ─────────────────────────────────────────────────
export const CONTEXTOS = {
  cliente: { nome: 'Cliente', dica: 'Perguntas gerais sobre a pessoa. Respostas ficam na ficha do cliente.', escopo: 'cliente' },
  consulta: { nome: 'Consulta', dica: 'Perguntas antes/durante a consulta. Respostas ficam na ficha do cliente.', escopo: 'cliente' },
  demanda: { nome: 'Demanda', dica: 'Perguntas de um serviço (pacto, inventário, divórcio…). Respostas ficam na demanda.', escopo: 'demanda' },
} as const
export type ContextoFormulario = keyof typeof CONTEXTOS
export const escopoDoContexto = (c: string): 'cliente' | 'demanda' => (c === 'demanda' ? 'demanda' : 'cliente')

// ─── Lógica condicional ─────────────────────────────────────────────────────
export type Valor = string | string[] | null
export type Operador = 'igual' | 'diferente' | 'contem' | 'nao_contem' | 'preenchida' | 'vazia' | 'maior' | 'menor'

export const OPERADORES: Record<Operador, { nome: string; comValor: boolean }> = {
  igual: { nome: 'é igual a', comValor: true },
  diferente: { nome: 'é diferente de', comValor: true },
  contem: { nome: 'contém', comValor: true },
  nao_contem: { nome: 'não contém', comValor: true },
  preenchida: { nome: 'foi respondida', comValor: false },
  vazia: { nome: 'não foi respondida', comValor: false },
  maior: { nome: 'é maior que', comValor: true },
  menor: { nome: 'é menor que', comValor: true },
}

/** Só operadores que fazem sentido para o tipo da pergunta de origem. Os rótulos acompanham a linguagem do tipo. */
export function operadoresDoTipo(tipo: string): { valor: Operador; nome: string }[] {
  const o = (valor: Operador, nome?: string) => ({ valor, nome: nome ?? OPERADORES[valor].nome })
  switch (tipo) {
    case 'sim_nao': case 'selecao_unica': case 'lista_suspensa': return [o('igual'), o('diferente'), o('preenchida'), o('vazia')]
    case 'selecao_multipla': case 'checklist': return [o('contem', 'selecionou'), o('nao_contem', 'não selecionou'), o('preenchida', 'selecionou alguma'), o('vazia', 'não selecionou nada')]
    case 'numero': return [o('igual'), o('diferente'), o('maior'), o('menor'), o('preenchida'), o('vazia')]
    case 'data': return [o('preenchida'), o('vazia')]
    default: return [o('contem'), o('nao_contem'), o('igual'), o('preenchida'), o('vazia')] // textos, e-mail, telefone
  }
}
export const operadorValido = (tipo: string, op: string) => operadoresDoTipo(tipo).some(x => x.valor === op)
/** Perguntas cuja resposta pode condicionar outras: as que o cliente responde (não o checklist interno). */
export const podeCondicionar = (tipo: string) => !tipoInterno(tipo)

export interface Regra { pergunta_id: number; operador: Operador; valor?: string | null }
export interface Condicao { juntar: 'e' | 'ou'; regras: Regra[] }

/** Aceita o formato atual e o antigo ({ pergunta_id, igual_a }); devolve null se não houver condição válida. */
export function normalizarCondicao(raw: any): Condicao | null {
  if (!raw || typeof raw !== 'object') return null
  const regrasBrutas: any[] = Array.isArray(raw.regras) ? raw.regras : (raw.pergunta_id != null && raw.igual_a != null ? [{ pergunta_id: raw.pergunta_id, operador: 'igual', valor: raw.igual_a }] : [])
  const regras: Regra[] = []
  for (const r of regrasBrutas) {
    const pid = Number(r?.pergunta_id)
    const op = r?.operador as Operador
    if (!Number.isInteger(pid) || pid === 0 || !(op in OPERADORES)) continue
    const valor = OPERADORES[op].comValor ? String(r?.valor ?? '').trim().slice(0, 200) : null
    if (OPERADORES[op].comValor && !valor) continue
    regras.push({ pergunta_id: pid, operador: op, ...(valor != null ? { valor } : {}) })
  }
  return regras.length ? { juntar: raw.juntar === 'ou' ? 'ou' : 'e', regras: regras.slice(0, 6) } : null
}

const vazio = (v: Valor | undefined) => v == null || v === '' || (Array.isArray(v) && v.length === 0)
const num = (x: unknown) => Number(String(x ?? '').replace(',', '.'))
const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function avaliarRegra(r: Regra, v: Valor | undefined): boolean {
  const alvo = String(r.valor ?? '')
  switch (r.operador) {
    case 'preenchida': return !vazio(v)
    case 'vazia': return vazio(v)
    case 'igual': {
      if (Array.isArray(v)) return v.includes(alvo)
      if (vazio(v)) return false
      const texto = String(v).trim()
      if (/^-?[\d.,]+$/.test(texto) && /^-?[\d.,]+$/.test(alvo.trim())) return num(texto) === num(alvo)
      return semAcento(texto) === semAcento(alvo.trim())
    }
    case 'diferente': return !avaliarRegra({ ...r, operador: 'igual' }, v)
    case 'contem': return Array.isArray(v) ? v.includes(alvo) : (!vazio(v) && semAcento(String(v)).includes(semAcento(alvo)))
    case 'nao_contem': return !avaliarRegra({ ...r, operador: 'contem' }, v)
    case 'maior': return !vazio(v) && Number.isFinite(num(v)) && num(v) > num(alvo)
    case 'menor': return !vazio(v) && Number.isFinite(num(v)) && num(v) < num(alvo)
  }
}

export function avaliarCondicao(c: Condicao | null | undefined, respostas: Record<number, Valor | undefined>): boolean {
  if (!c || !c.regras.length) return true
  const res = c.regras.map(r => avaliarRegra(r, respostas[r.pergunta_id]))
  return c.juntar === 'ou' ? res.some(Boolean) : res.every(Boolean)
}

// ─── Estrutura de um formulário (usada por construtor, preenchimento, ficha e servidor) ──
export interface PerguntaForm {
  pergunta_id: number // negativo = ainda não salva (rascunho no construtor)
  texto: string
  tipo: TipoPergunta
  opcoes: string[]
  ajuda: string | null
  obrigatoria: boolean
  mostrar_se: Condicao | null
}
export interface SecaoForm {
  id: number | null
  titulo: string
  descricao: string | null
  mostrar_se: Condicao | null
  itens: PerguntaForm[]
}

/**
 * Quais seções e perguntas aparecem, dadas as respostas. Percorre na ordem do formulário; a resposta de uma
 * pergunta escondida NÃO conta para condições de outras (a lógica em cascata do Google Forms).
 */
export function calcularVisibilidade(secoes: SecaoForm[], respostas: Record<number, Valor | undefined>) {
  const efetivas: Record<number, Valor | undefined> = {}
  const secoesVisiveis = new Set<number>()
  const perguntasVisiveis = new Set<number>()
  secoes.forEach((s, si) => {
    const secaoOk = avaliarCondicao(s.mostrar_se, efetivas)
    if (secaoOk) secoesVisiveis.add(si)
    for (const p of s.itens) {
      if (secaoOk && avaliarCondicao(p.mostrar_se, efetivas)) {
        perguntasVisiveis.add(p.pergunta_id)
        efetivas[p.pergunta_id] = respostas[p.pergunta_id]
      }
    }
  })
  return { secoes: secoesVisiveis, perguntas: perguntasVisiveis, efetivas }
}

/** Valida referências: uma condição só pode depender de pergunta ANTERIOR e de tipo compatível com o operador. */
export function validarCondicoes(secoes: SecaoForm[]): string | null {
  const anteriores = new Map<number, PerguntaForm>()
  const checar = (c: Condicao | null, rotulo: string): string | null => {
    if (!c) return null
    for (const r of c.regras) {
      const p = anteriores.get(r.pergunta_id)
      if (!p) return `A condição de "${rotulo}" depende de uma pergunta que não existe ou vem depois dela.`
      if (!podeCondicionar(p.tipo)) return `A condição de "${rotulo}" usa um checklist interno, que não é respondido no formulário.`
      if (!operadorValido(p.tipo, r.operador)) return `A condição de "${rotulo}" usa "${OPERADORES[r.operador].nome}", que não vale para "${p.texto}".`
    }
    return null
  }
  for (const s of secoes) {
    const e = checar(s.mostrar_se, s.titulo || 'seção')
    if (e) return e
    for (const p of s.itens) {
      const e2 = checar(p.mostrar_se, p.texto)
      if (e2) return e2
      anteriores.set(p.pergunta_id, p)
    }
  }
  return null
}

/** Texto legível da condição, para a ficha e o construtor ("Se Tem filhos? for igual a Sim"). */
export function descreverCondicao(c: Condicao | null, nomeDe: (id: number) => string, tipoDe: (id: number) => string): string {
  if (!c) return ''
  const partes = c.regras.map((r) => {
    const nome = operadoresDoTipo(tipoDe(r.pergunta_id)).find(o => o.valor === r.operador)?.nome ?? OPERADORES[r.operador].nome
    return `“${nomeDe(r.pergunta_id)}” ${nome}${OPERADORES[r.operador].comValor ? ` “${r.valor}”` : ''}`
  })
  return partes.join(c.juntar === 'ou' ? ' ou ' : ' e ')
}
