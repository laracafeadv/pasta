/**
 * Domínio do escritório Lara Café Advocacia & Consultoria.
 * Constantes compartilhadas entre telas, API e agente de IA — altere aqui para
 * mudar etapas, áreas ou listas em todo o sistema.
 */

// Etapas espelham o "Como funciona" do site: contato → diagnóstico → acompanhamento → solução.
export const ETAPAS = [
  { id: 'novo', nome: 'Novo contato', hint: 'Responder em até 24h', aberta: true },
  { id: 'agendado', nome: 'Consulta agendada', hint: 'Contato inicial', aberta: true },
  { id: 'diagnostico', nome: 'Diagnóstico', hint: 'Análise do caso', aberta: true },
  { id: 'proposta', nome: 'Proposta enviada', hint: 'Honorários', aberta: true },
  { id: 'ativo', nome: 'Cliente ativo', hint: 'Acompanhamento', aberta: true },
  { id: 'concluido', nome: 'Concluído', hint: 'Solução entregue', aberta: false },
  { id: 'perdido', nome: 'Não contratou', hint: 'Encerrado', aberta: false },
] as const

export type EtapaId = typeof ETAPAS[number]['id']
export const ETAPAS_GANHAS: EtapaId[] = ['ativo', 'concluido']

export const AREAS: Record<string, string[]> = {
  'Direito de Família': ['Divórcio', 'União estável', 'Guarda e convivência', 'Pensão alimentícia', 'Outro'],
  'Sucessões': ['Inventário', 'Partilha de bens', 'Testamento', 'Planejamento sucessório', 'Outro'],
  'Planejamento Matrimonial': ['Pacto antenupcial', 'Contrato de convivência', 'Regime de bens', 'Outro'],
  'Consultoria Jurídica': ['Parecer', 'Consultoria contínua', 'Outro'],
}

export const ORIGENS = ['WhatsApp', 'Formulário do site', 'Instagram', 'Indicação de cliente', 'Indicação de colega', 'Blog', 'Outro']

export const MOTIVOS_PERDA = [
  'Honorários acima do orçamento',
  'Não respondeu mais',
  'Escolheu outro escritório',
  'Resolveu sem advogado',
  'Fora da área de atuação',
  'Conflito de interesses',
  'Outro',
]

export const URGENCIAS = ['Alta', 'Média', 'Baixa'] as const
export const SENTIMENTOS = ['Positivo', 'Neutro', 'Negativo'] as const

export const TIPOS_HONORARIO = ['Consulta', 'Contrato fixo', 'Êxito', 'Assessoria mensal'] as const
export const STATUS_HONORARIO = ['Proposta', 'Contratado', 'Pago', 'Cancelado'] as const
// Status que contam como receita do escritório
export const STATUS_RECEITA = ['Contratado', 'Pago']

export function etapa(id: string | null | undefined) {
  return ETAPAS.find(e => e.id === id) ?? ETAPAS[0]
}

export interface Contato {
  id: number
  created_at: string
  updated_at: string
  telefone: string
  nome: string | null
  email: string | null
  cidade: string | null
  origem: string | null
  area: string | null
  demanda: string | null
  parte_contraria: string | null
  resumo: string | null
  sentimento: typeof SENTIMENTOS[number] | null
  urgencia: typeof URGENCIAS[number] | null
  interesses: string[]
  objecoes: string[]
  etapa: EtapaId
  motivo_perda: string | null
  proxima_acao: string | null
  proxima_data: string | null
  responsavel_id: string | null
  ia_ativa: boolean
  consentimento_em: string | null
  ultima_mensagem_em: string | null
}

export type ContatoInput = Partial<Omit<Contato, 'id' | 'created_at' | 'updated_at'>>

// Campos que a equipe pode editar pela API (lista branca contra mass-assignment).
export const CONTATO_CAMPOS_EDITAVEIS = [
  'telefone', 'nome', 'email', 'cidade', 'origem', 'area', 'demanda', 'parte_contraria', 'resumo',
  'sentimento', 'urgencia', 'interesses', 'objecoes', 'etapa', 'motivo_perda', 'proxima_acao',
  'proxima_data', 'responsavel_id', 'ia_ativa',
] as const

export interface Honorario {
  id: number
  created_at: string
  updated_at: string
  contato_id: number
  descricao: string | null
  valor: number
  tipo: typeof TIPOS_HONORARIO[number]
  status: typeof STATUS_HONORARIO[number]
  forma_pagamento: string | null
  parcelas: number
  data_contratacao: string | null
  responsavel_id: string | null
  observacao: string | null
  // join
  contato?: Pick<Contato, 'id' | 'nome' | 'telefone'> | null
}

export const HONORARIO_CAMPOS_EDITAVEIS = [
  'contato_id', 'descricao', 'valor', 'tipo', 'status', 'forma_pagamento', 'parcelas',
  'data_contratacao', 'responsavel_id', 'observacao',
] as const

export interface MensagemWhatsapp {
  id: number
  created_at: string
  contato_id: number
  direcao: 'entrada' | 'saida'
  autor: 'cliente' | 'ia' | 'equipe'
  autor_id: string | null
  conteudo: string
  tipo: string
  wa_message_id: string | null
}

export interface Atividade {
  id: number
  created_at: string
  contato_id: number
  autor_id: string | null
  tipo: string
  texto: string
  autor?: { name: string } | null
}

export const TIPOS_ATIVIDADE = ['Anotação', 'Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Documento recebido']

export function pick<T extends Record<string, any>>(obj: T, keys: readonly string[]): Partial<T> {
  const out: Record<string, any> = {}
  for (const k of keys) if (obj && k in obj) out[k] = obj[k]
  return out as Partial<T>
}

/** Só dígitos; acrescenta DDI 55 para números brasileiros sem DDI. */
export function normalizarTelefone(raw: string | null | undefined): string {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  return d
}

/** Normaliza nomes para comparação (sem acento, minúsculo, espaços simples). */
export function normalizarNome(s: string | null | undefined): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}
