/**
 * Domínio do escritório Lara Café Advocacia & Consultoria.
 * Constantes compartilhadas entre telas, API e agente de IA — altere aqui para
 * mudar etapas, áreas ou listas em todo o sistema.
 */

// Etapas espelham o "Como funciona" do site: contato → diagnóstico → acompanhamento → solução.
export const ETAPAS = [
  { id: 'novo', nome: 'Novo contato', hint: 'Responder em minutos', aberta: true },
  { id: 'qualificacao', nome: 'Em qualificação', hint: 'Entender e convidar p/ consulta', aberta: true },
  { id: 'agendado', nome: 'Consulta agendada', hint: 'Confirmar e preparar', aberta: true },
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
  etapa_desde: string
  consulta_em: string | null
  data_nascimento: string | null
  classificacao: Classificacao | null
  nps: number | null
  ia_ativa: boolean
  consentimento_em: string | null
  ultima_mensagem_em: string | null
}

export type ContatoInput = Partial<Omit<Contato, 'id' | 'created_at' | 'updated_at'>>

// Campos que a equipe pode editar pela API (lista branca contra mass-assignment).
export const CONTATO_CAMPOS_EDITAVEIS = [
  'telefone', 'nome', 'email', 'cidade', 'origem', 'area', 'demanda', 'parte_contraria', 'resumo',
  'sentimento', 'urgencia', 'interesses', 'objecoes', 'etapa', 'motivo_perda', 'proxima_acao',
  'proxima_data', 'responsavel_id', 'ia_ativa', 'consulta_em', 'data_nascimento', 'classificacao', 'nps',
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
  midia_path: string | null
  midia_tipo: string | null
  midia_nome: string | null
  transcricao: string | null
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

// ─── Classificação da carteira (playbook de Classificação de Clientes) ─────
export const CLASSIFICACOES = {
  promotora: { nome: 'Promotora', dica: 'Priorize resposta e cuidado: é quem indica e avalia.' },
  neutra: { nome: 'Neutra', dica: 'Revise toda semana: são as conversas mais fáceis de esquecer.' },
  fria: { nome: 'Fria', dica: 'Reserve um bloco fixo na semana para reaquecer, sem pressa.' },
  detratora: { nome: 'Detratora', dica: 'Avalie caso a caso: reparar ou blindar, nunca ignorar.' },
} as const
export type Classificacao = keyof typeof CLASSIFICACOES

/**
 * Cadência sugerida ao entrar em cada etapa (playbooks "WhatsApp Otimizado" e
 * "Scripts que Vendem"). Aparece pré-preenchida no "Registrar andamento".
 * `modelo` aponta para o atalho da biblioteca de mensagens.
 */
export const CADENCIA: Record<string, { acao: string; dias: number; modelo?: string }> = {
  novo: { acao: 'Responder pessoalmente', dias: 0, modelo: '/boasvindas' },
  qualificacao: { acao: 'Convidar para a consulta estratégica', dias: 1, modelo: '/consulta' },
  agendado: { acao: 'Lembrete da consulta (dia anterior)', dias: -1, modelo: '/lembrete' },
  diagnostico: { acao: 'Enviar resumo, próximos passos e proposta', dias: 0, modelo: '/resumo' },
  proposta: { acao: 'Follow-up 24h da proposta', dias: 1, modelo: '/followup-24h' },
  ativo: { acao: 'Enviar checklist de documentos', dias: 1, modelo: '/documentos' },
}

/** Próximo passo depois de concluir um follow-up (24h → 7 dias → final). */
export const SEQUENCIA_FOLLOWUP: { se: RegExp; acao: string; dias: number; modelo: string }[] = [
  { se: /follow-up 24h/i, acao: 'Follow-up 7 dias da proposta', dias: 6, modelo: '/followup-7d' },
  { se: /follow-up 7 dias/i, acao: 'Follow-up final (14 dias)', dias: 7, modelo: '/followup-final' },
]

// ─── Documentos por área (base: plataforma-adv + playbook) ─────────────────
// [descrição, obrigatório]
export const DOCUMENTOS_POR_AREA: Record<string, [string, boolean][]> = {
  '*': [
    ['Documento de identidade (RG ou CNH)', true],
    ['CPF', true],
    ['Comprovante de residência atualizado', true],
  ],
  'Direito de Família': [
    ['Certidão de casamento ou declaração de união estável', true],
    ['Certidão de nascimento dos filhos', false],
    ['Comprovantes de renda', true],
    ['Documentos dos bens (imóveis, veículos, extratos)', false],
    ['Conversas ou provas relevantes', false],
  ],
  'Sucessões': [
    ['Certidão de óbito', true],
    ['Certidões de nascimento ou casamento dos herdeiros', true],
    ['Documentos dos bens (matrículas, CRLV, extratos)', true],
    ['Testamento', false],
    ['Certidões negativas de débitos do falecido', false],
  ],
  'Planejamento Matrimonial': [
    ['Certidão de nascimento (ou casamento anterior averbada)', true],
    ['Relação dos bens de cada um', false],
  ],
  'Consultoria Jurídica': [
    ['Documentos relacionados à consulta', false],
  ],
  fim: [
    ['Procuração assinada', true],
    ['Contrato de honorários assinado', true],
  ],
}

export interface Documento {
  id: number
  contato_id: number
  descricao: string
  obrigatorio: boolean
  status: 'pendente' | 'recebido' | 'dispensado'
  observacao: string | null
  ordem: number
  atualizado_em: string
}

export interface ModeloMensagem {
  id: number
  categoria: string
  titulo: string
  atalho: string
  texto: string
  ordem: number
  ativo: boolean
}

// ─── Dados do escritório (tela "Escritório"; alimentam a Ana e as peças) ─────
export const ESCRITORIO_CAMPOS = [
  { chave: 'advogada_nome', rotulo: 'Nome da advogada', grupo: 'Identificação', exemplo: 'Lara Café' },
  { chave: 'oab', rotulo: 'OAB (número/UF)', grupo: 'Identificação', exemplo: '000.000/SP' },
  { chave: 'advogada_qualificacao', rotulo: 'Qualificação (nacionalidade, estado civil)', grupo: 'Identificação', exemplo: 'brasileira, solteira' },
  { chave: 'email', rotulo: 'E-mail profissional', grupo: 'Identificação', exemplo: 'laracafe.adv@gmail.com' },
  { chave: 'telefone', rotulo: 'Telefone / WhatsApp', grupo: 'Identificação', exemplo: '(71) 99381-2266' },
  { chave: 'endereco', rotulo: 'Endereço profissional completo', grupo: 'Identificação', exemplo: 'Rua…, nº…, bairro, cidade/UF, CEP' },
  { chave: 'cidade_foro', rotulo: 'Cidade para foro e assinatura', grupo: 'Identificação', exemplo: 'Salvador/BA' },
  { chave: 'valor_consulta', rotulo: 'Valor da consulta', grupo: 'Consulta (usado pela Ana)', exemplo: 'R$ 350,00' },
  { chave: 'consulta_abatida', rotulo: 'Consulta abatida dos honorários?', grupo: 'Consulta (usado pela Ana)', exemplo: 'sim' },
  { chave: 'duracao_consulta', rotulo: 'Duração média da consulta', grupo: 'Consulta (usado pela Ana)', exemplo: '60 minutos' },
  { chave: 'plataforma_consulta', rotulo: 'Plataforma da videochamada', grupo: 'Consulta (usado pela Ana)', exemplo: 'Google Meet' },
  { chave: 'horario_atendimento', rotulo: 'Horário de atendimento da equipe', grupo: 'Consulta (usado pela Ana)', exemplo: 'segunda a sexta, das 9h às 18h' },
  { chave: 'chave_pix', rotulo: 'Chave PIX (enviada só pela equipe)', grupo: 'Pagamento', exemplo: 'CNPJ ou e-mail' },
  { chave: 'link_avaliacao', rotulo: 'Link de avaliação no Google', grupo: 'Pagamento', exemplo: 'https://g.page/…' },
] as const
export type ChaveEscritorio = typeof ESCRITORIO_CAMPOS[number]['chave']
export type Escritorio = Partial<Record<ChaveEscritorio, string>>

// ─── Cliente, casos e agenda ──────────────────────────────────────────────
export const ESTADOS_CIVIS = ['solteiro(a)', 'casado(a)', 'em união estável', 'divorciado(a)', 'separado(a) judicialmente', 'viúvo(a)']
export const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export interface Qualificacao {
  contato_id: number
  nome_completo: string | null
  cpf: string | null
  rg: string | null
  orgao_emissor: string | null
  nacionalidade: string | null
  estado_civil: string | null
  profissao: string | null
  endereco: string | null
  bairro: string | null
  cep: string | null
  cidade: string | null
  uf: string | null
  mascarado?: boolean
}
export const QUALIFICACAO_CAMPOS = ['nome_completo', 'cpf', 'rg', 'orgao_emissor', 'nacionalidade', 'estado_civil', 'profissao', 'endereco', 'bairro', 'cep', 'cidade', 'uf'] as const
export const CAMPOS_CONFIDENCIAIS = ['cpf', 'rg'] as const

export const TIPOS_CASO = { judicial: 'Judicial', extrajudicial: 'Extrajudicial (cartório)', consultivo: 'Consultivo' } as const
export const STATUS_CASO = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado' } as const
export interface Caso {
  id: number
  created_at: string
  contato_id: number
  titulo: string
  area: string | null
  tipo: keyof typeof TIPOS_CASO
  numero_processo: string | null
  orgao: string | null
  comarca: string | null
  uf: string | null
  parte_contraria: string | null
  status: keyof typeof STATUS_CASO
  data_abertura: string
  data_encerramento: string | null
  observacoes: string | null
  contato?: Pick<Contato, 'id' | 'nome'> | null
}
export const CASO_CAMPOS = ['contato_id', 'titulo', 'area', 'tipo', 'numero_processo', 'orgao', 'comarca', 'uf', 'parte_contraria', 'status', 'data_abertura', 'data_encerramento', 'observacoes'] as const

export const TIPOS_COMPROMISSO = {
  prazo: { nome: 'Prazo processual', icone: 'ph:hourglass-high-bold' },
  audiencia: { nome: 'Audiência', icone: 'ph:gavel-bold' },
  consulta: { nome: 'Consulta', icone: 'ph:video-camera-bold' },
  reuniao: { nome: 'Reunião', icone: 'ph:users-bold' },
  tarefa: { nome: 'Tarefa', icone: 'ph:check-square-bold' },
} as const
export interface Compromisso {
  id: number
  tipo: keyof typeof TIPOS_COMPROMISSO
  titulo: string
  contato_id: number | null
  caso_id: number | null
  inicio: string | null
  data_limite: string | null
  data_publicacao: string | null
  dias_prazo: number | null
  local: string | null
  status: 'pendente' | 'concluido' | 'cancelado'
  observacao: string | null
  contato?: Pick<Contato, 'id' | 'nome'> | null
  caso?: Pick<Caso, 'id' | 'titulo' | 'numero_processo'> | null
}
export const COMPROMISSO_CAMPOS = ['tipo', 'titulo', 'contato_id', 'caso_id', 'inicio', 'data_limite', 'data_publicacao', 'dias_prazo', 'local', 'status', 'observacao'] as const

/** Data de referência do compromisso (AAAA-MM-DD). */
export function dataCompromisso(c: Pick<Compromisso, 'inicio' | 'data_limite'>): string {
  if (c.data_limite) return c.data_limite
  return c.inicio ? new Date(c.inicio).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) : ''
}

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
