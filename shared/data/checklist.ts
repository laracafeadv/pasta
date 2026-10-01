// Itens do checklist do atendimento. Vêm dos passos do Padrão Operacional (app/pages/manual.vue):
// só entra o que é uma verificação simples de "feito / não feito". Orientações, mensagens que o
// sistema já lembra (Hoje), prazos (Prazos) e tarefas (Tarefas) NÃO viram checkbox.
import { SERVICOS } from './servicos'

export interface DefinicaoItem {
  chave: string
  /** Fase do Padrão Operacional (1 a 6) — define quando o item passa a aparecer. */
  fase: number
  titulo: string
  tipo: 'auto' | 'manual'
  dica: string
}

export const NOMES_FASES: Record<number, string> = {
  1: 'Atendimento inicial',
  2: 'Consulta e análise',
  3: 'Proposta e fechamento',
  4: 'Abertura do caso',
  6: 'Encerramento e pós-venda',
}

export const ITENS_ATENDIMENTO: DefinicaoItem[] = [
  { chave: 'consulta_paga', fase: 1, titulo: 'Consulta paga', tipo: 'auto', dica: 'Vem do honorário de consulta marcado como pago, no Financeiro.' },
  { chave: 'consulta_agendada', fase: 1, titulo: 'Consulta agendada', tipo: 'auto', dica: 'Vem da data da consulta, registrada ao mover o contato para "Consulta agendada".' },
  { chave: 'pre_form', fase: 1, titulo: 'Formulário pré-consulta respondido', tipo: 'auto', dica: 'Vem da resposta recebida pelo link do formulário.' },
  { chave: 'diagnostico', fase: 2, titulo: 'Análise da consulta registrada', tipo: 'auto', dica: 'Vem do bloco "Análise do escritório" da demanda (análise, riscos ou decisão preenchidos).' },
  { chave: 'feedback_consulta', fase: 2, titulo: 'Feedback pós-consulta enviado', tipo: 'manual', dica: 'O sistema só lembra (/feedback). Marque quando você enviar.' },
  { chave: 'proposta', fase: 3, titulo: 'Proposta de honorários registrada', tipo: 'auto', dica: 'Vem do honorário registrado (proposta, contratado ou pago) no Financeiro.' },
  { chave: 'honorario_fechado', fase: 3, titulo: 'Honorário contratado', tipo: 'auto', dica: 'Vem do honorário com status Contratado ou Pago.' },
  { chave: 'dados_contrato', fase: 3, titulo: 'Dados para o contrato recebidos', tipo: 'auto', dica: 'Vem do formulário de dados do contrato, ou da qualificação com CPF e endereço.' },
  { chave: 'contrato_enviado', fase: 3, titulo: 'Contrato e procuração enviados para assinatura', tipo: 'manual', dica: 'Gerar o Word não prova que foi enviado. Marque quando mandar.' },
  { chave: 'contrato_assinado', fase: 3, titulo: 'Contrato e procuração assinados', tipo: 'auto', dica: 'Vem do checklist de Documentos: "Procuração assinada" e "Contrato de honorários assinado" como recebidos.' },
  { chave: 'pasta_drive', fase: 4, titulo: 'Pasta do cliente no Drive', tipo: 'auto', dica: 'Vem da pasta criada para o cliente.' },
  { chave: 'caso_aberto', fase: 4, titulo: 'Demanda aberta', tipo: 'auto', dica: 'Vem da demanda cadastrada na aba Demandas.' },
  { chave: 'docs_obrigatorios', fase: 4, titulo: 'Documentos obrigatórios recebidos', tipo: 'auto', dica: 'Vem do checklist de Documentos: todos os obrigatórios recebidos ou dispensados.' },
  { chave: 'caso_encerrado', fase: 6, titulo: 'Demanda encerrada com resultado', tipo: 'auto', dica: 'Vem da demanda encerrada, com o resultado registrado.' },
  { chave: 'pesquisa_enviada', fase: 6, titulo: 'Pesquisa de satisfação enviada', tipo: 'manual', dica: 'Marque quando enviar o convite da pesquisa.' },
  { chave: 'nps', fase: 6, titulo: 'Nota NPS registrada', tipo: 'auto', dica: 'Vem da nota de 0 a 10 registrada na ficha.' },
  { chave: 'avaliacao_pedida', fase: 6, titulo: 'Pedido de avaliação no Google enviado', tipo: 'manual', dica: 'Só para quem deu nota 9 ou 10 (mensagem /avaliacao).' },
]

/** Até qual fase o atendimento já chegou, pela etapa do funil. Perdido não tem checklist. */
export const FASE_MAXIMA_POR_ETAPA: Record<string, number> = {
  novo: 1, qualificacao: 1, agendado: 2, diagnostico: 2, proposta: 3, ativo: 4, concluido: 6,
}

// ─── Procedimentos por serviço (etapas de cada caso) ───────────────────────────────────────
export interface Procedimento { valor: string; rotulo: string; servico: string; variante: string }
export const PROCEDIMENTOS: Procedimento[] = SERVICOS.flatMap(s => s.variantes.map(v => ({
  valor: `${s.id}/${v.id}`,
  rotulo: s.variantes.length > 1 ? `${s.nome} — ${v.nome}` : s.nome,
  servico: s.id,
  variante: v.id,
})))

/**
 * A demanda (pelo seu procedimento) é alvo de um formulário/pergunta restrito a certos serviços?
 * Lista vazia = vale para todas. "servico/*" = todas as formas daquele serviço (ex.: "divorcio/*").
 * Demanda sem procedimento só recebe o que vale para todas.
 */
export const SERVICOS_IDS: string[] = SERVICOS.map(s => s.id)
export function procedimentoCasa(lista: string[] | null | undefined, procedimento: string | null | undefined): boolean {
  if (!lista?.length) return true
  if (!procedimento) return false
  return lista.some(v => v === procedimento || (v.endsWith('/*') && procedimento.startsWith(v.slice(0, -1))))
}

/** Sugere o procedimento a partir da demanda do contato e do tipo do caso (o usuário pode trocar). */
const SERVICO_POR_DEMANDA: Record<string, string> = {
  'Divórcio': 'divorcio',
  'Guarda e convivência': 'guarda-alimentos',
  'Pensão alimentícia': 'guarda-alimentos',
  'Inventário': 'inventario',
  'Partilha de bens': 'inventario',
  'Testamento': 'testamento',
  'Planejamento sucessório': 'planejamento',
  'Regime de bens': 'alteracao-regime-bens',
  'Pacto antenupcial': 'pacto-antenupcial',
}
export function sugerirProcedimento(demanda: string | null | undefined, tipo: string | null | undefined): string | null {
  const servico = SERVICO_POR_DEMANDA[demanda ?? '']
  if (!servico) return null
  const opcoes = PROCEDIMENTOS.filter(p => p.servico === servico)
  return (opcoes.find(p => p.variante === tipo) ?? opcoes.find(p => tipo && p.variante.startsWith(tipo)) ?? opcoes[0])?.valor ?? null
}
