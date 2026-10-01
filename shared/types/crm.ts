/**
 * Domínio do escritório Lara Café Advocacia & Consultoria.
 * Constantes compartilhadas entre telas, API e agente de IA — altere aqui para
 * mudar etapas, áreas ou listas em todo o sistema.
 */

// Etapas espelham o "Como funciona" do site: contato → consulta → acompanhamento → solução.
export const ETAPAS = [
  { id: 'novo', nome: 'Novo contato', hint: 'Responder em minutos', aberta: true },
  { id: 'qualificacao', nome: 'Em qualificação', hint: 'Entender e convidar p/ consulta', aberta: true },
  { id: 'agendado', nome: 'Consulta agendada', hint: 'Confirmar e preparar', aberta: true },
  { id: 'diagnostico', nome: 'Consulta realizada', hint: 'Análise feita, falta a proposta', aberta: true },
  { id: 'proposta', nome: 'Proposta enviada', hint: 'Honorários', aberta: true },
  { id: 'ativo', nome: 'Cliente ativo', hint: 'Acompanhamento', aberta: true },
  { id: 'concluido', nome: 'Concluído', hint: 'Solução entregue', aberta: false },
  { id: 'perdido', nome: 'Não contratou', hint: 'Encerrado', aberta: false },
  { id: 'relacionado', nome: 'Pessoa cadastrada', hint: 'Parte ou interessado (não é lead nem cliente)', aberta: false },
] as const

export type EtapaId = typeof ETAPAS[number]['id']
export const ETAPAS_GANHAS: EtapaId[] = ['ativo', 'concluido']

export const AREAS: Record<string, string[]> = {
  'Direito de Família': ['Divórcio', 'União estável', 'Guarda e convivência', 'Pensão alimentícia', 'Outro'],
  'Sucessões': ['Inventário', 'Partilha de bens', 'Testamento', 'Planejamento sucessório', 'Outro'],
  'Planejamento Matrimonial': ['Pacto antenupcial', 'Contrato de convivência', 'Regime de bens', 'Outro'],
  'Consultoria Jurídica': ['Parecer', 'Consultoria contínua', 'Outro'],
}

// Etiquetas de origem do quadro "Controle de relacionamento" (Trello) + o WhatsApp direto.
export const ORIGENS = ['Instagram', 'Google', 'Site', 'LinkedIn', 'Indicação de cliente', 'Indicação de parceiro/conhecido', 'WhatsApp', 'Outros']

// Etiquetas de "Prospects finalizados" (Trello) + casos que o escritório recusa.
export const MOTIVOS_PERDA = [
  'Achou caro',
  'Fechou com outro profissional',
  'Motivo pessoal (reconciliação, adiou, etc.)',
  'Não teve interesse',
  'Não respondeu',
  'Resolveu sem advogado',
  'Fora da área de atuação',
  'Encaminhado a parceiro(a)',
  'Conflito de interesses',
  'Outro',
]
/** Quem não fechou por estes motivos não entra no remarketing (não faz sentido ou não é ético insistir). */
export const MOTIVOS_SEM_REMARKETING = ['Fora da área de atuação', 'Encaminhado a parceiro(a)', 'Conflito de interesses']
/** Intervalo mínimo entre conteúdos de remarketing para a mesma pessoa. */
export const REMARKETING_INTERVALO_DIAS = 45

export const URGENCIAS = ['Alta', 'Média', 'Baixa'] as const

export const SENTIMENTOS = ['Positivo', 'Neutro', 'Negativo'] as const

export const TIPOS_HONORARIO = ['Consulta', 'Contrato fixo', 'Em camadas', 'Êxito', 'Assessoria mensal'] as const
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
  classificacao_desde: string | null
  nps: number | null
  ultimo_contato_em: string | null
  obs_relacionamento: string | null
  dor: string | null
  objetivo: string | null
  drive_pasta_url?: string | null
  nao_contatar?: boolean
  tem_filhos?: boolean | null
  form_respondido_em?: string | null
  pre_form_respondido_em?: string | null
  pre_form_pergunta_extra?: string | null
  pre_form_campos_ativos?: string[] | null
  pre_form_perguntas_extra?: string[] | null
  pre_form_respostas_extra?: (string | null)[] | null
  processo_em_andamento?: boolean | null
  /** Rascunho de resposta deixado pela rotina do Claude (some quando você responde). */
  sugestao_resposta?: string | null
  sugestao_em?: string | null
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
  'obs_relacionamento', 'dor', 'objetivo', 'nao_contatar', 'sugestao_resposta',
] as const

export interface Honorario {
  id: number
  created_at: string
  updated_at: string
  contato_id: number
  caso_id?: number | null
  descricao: string | null
  valor: number
  tipo: typeof TIPOS_HONORARIO[number]
  status: typeof STATUS_HONORARIO[number]
  forma_pagamento: string | null
  parcelas: number
  data_contratacao: string | null
  responsavel_id: string | null
  observacao: string | null
  // Em camadas: arranque (valor) + mensal por prazo + % do proveito econômico + validade
  valor_mensal?: number | null
  meses?: number | null
  percentual_exito?: number | null
  validade_anos?: number | null
  // join
  contato?: Pick<Contato, 'id' | 'nome' | 'telefone'> | null
}

export const HONORARIO_CAMPOS_EDITAVEIS = [
  'contato_id', 'caso_id', 'descricao', 'valor', 'tipo', 'status', 'forma_pagamento', 'parcelas',
  'data_contratacao', 'responsavel_id', 'observacao', 'valor_mensal', 'meses', 'percentual_exito', 'validade_anos',
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
  drive_url?: string | null
}

export interface Atividade {
  id: number
  created_at: string
  contato_id: number
  autor_id: string | null
  tipo: string
  texto: string
  minutos?: number | null
  caso_id?: number | null
  processo_id?: number | null
  autor?: { name: string } | null
}

export const TIPOS_ATIVIDADE = ['Anotação', 'Ligação', 'WhatsApp', 'E-mail', 'Reunião', 'Documento recebido', 'Peça / pesquisa', 'Relacionamento']

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
  // Quadro antigo: feedback no dia seguinte à consulta ("até amanhã enviaremos a proposta").
  diagnostico: { acao: 'Mensagem de feedback pós-consulta', dias: 1, modelo: '/feedback' },
  proposta: { acao: 'Follow-up 24h da proposta', dias: 1, modelo: '/followup-24h' },
  ativo: { acao: 'Enviar o formulário da cliente (dados e documentos)', dias: 0, modelo: '/formulario' },
}

/** Próximo passo depois de concluir um follow-up (24h → 7 dias → final). */
export const SEQUENCIA_FOLLOWUP: { se: RegExp; acao: string; dias: number; modelo: string; diasUteis?: boolean }[] = [
  // Checklist do quadro: proposta em até 2 dias úteis depois do atendimento (urgência alta: no mesmo dia).
  { se: /Convidar para a consulta/i, acao: 'Confirmar pagamento e agendar a consulta', dias: 1, modelo: '/opcoes' },
  { se: /feedback pós-consulta/i, acao: 'Enviar proposta (até 2 dias úteis após a consulta)', dias: 2, modelo: '/proposta', diasUteis: true },
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

/**
 * Documento de um cliente/demanda. `origem` distingue o que foi PEDIDO ao cliente do que foi PRODUZIDO pelo escritório.
 * Ciclo: pendente → recebido → conferido (pedido) | rascunho → final (produzido). Pode apontar para processo e parte.
 * O arquivo em si é referenciado por provedor + referência (drive, supabase ou link), sem cópias.
 */
export const STATUS_DOCUMENTO = { pendente: 'Pendente', recebido: 'Recebido', conferido: 'Conferido', dispensado: 'Dispensado', rascunho: 'Rascunho', final: 'Final' } as const
export interface Documento {
  id: number
  contato_id: number
  caso_id?: number | null
  processo_id?: number | null
  parte_id?: number | null
  origem?: 'solicitado' | 'produzido'
  arquivo_provedor?: 'drive' | 'supabase' | 'link' | null
  arquivo_ref?: string | null
  arquivo_url?: string | null
  arquivo_nome?: string | null
  arquivo_em?: string | null
  descricao: string
  obrigatorio: boolean
  status: keyof typeof STATUS_DOCUMENTO
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

import type { Condicao, ContextoFormulario, TipoPergunta } from '../data/formulario'
export type { TipoPergunta }

export interface FormularioPergunta {
  id: number
  texto: string
  tipo: TipoPergunta
  opcoes: string[]
  arquivada: boolean
  escopo: 'cliente' | 'demanda'
  procedimentos: string[]
  secao: string
  ordem: number
  ajuda: string | null
  versao?: number
}

/** Resposta atual de um cliente a uma pergunta (string, lista de opções marcadas ou nada). */
export type ValorResposta = string | string[] | null

/** Pergunta como aparece na ficha (Informações do cliente / da demanda), com a resposta atual. */
export interface PerguntaDaFicha {
  id: number
  texto: string
  tipo: TipoPergunta
  opcoes: string[]
  ajuda: string | null
  obrigatoria: boolean
  /** Pergunta que saiu do formulário mas tem resposta guardada (histórico). */
  arquivada: boolean
  mostrar_se: Condicao | null
  resposta: ValorResposta
  respondido_em: string | null
}
export interface SecaoDaFicha { nome: string; formulario_id: number | null; mostrar_se: Condicao | null; perguntas: PerguntaDaFicha[] }

export interface FormularioItem {
  id: number
  pergunta_id: number
  ordem: number
  obrigatoria: boolean
  pergunta: Pick<FormularioPergunta, 'id' | 'texto' | 'tipo'>
}

export interface Formulario {
  id: number
  nome: string
  descricao: string | null
  contexto: ContextoFormulario
  procedimentos: string[]
  ativo: boolean
  updated_at?: string
  itens: FormularioItem[]
}

export type StatusEnvioFormulario = 'gerado' | 'enviado' | 'visualizado' | 'iniciado' | 'respondido' | 'cancelado'

export interface FormularioEnvio {
  id: number
  created_at: string
  formulario_id: number | null
  contato_id: number
  token: string
  expira_em: string
  visualizado_em: string | null
  respondido_em: string | null
  status: StatusEnvioFormulario
  contato_nome: string | null
  formulario_nome: string | null
}

export interface FormularioEnvioResposta {
  id: number
  ordem: number
  pergunta_texto: string
  pergunta_tipo: TipoPergunta
  resposta: string | string[] | null
}

export interface FormularioEnvioDetalhe extends FormularioEnvio {
  resumo: string | null
  respostas: FormularioEnvioResposta[]
}

// ─── Dados do escritório (tela "Configurações"; alimentam as peças e as mensagens prontas) ─────
export const ESCRITORIO_CAMPOS = [
  { chave: 'advogada_nome', rotulo: 'Nome da advogada', grupo: 'Identificação', exemplo: 'Lara Café' },
  { chave: 'oab', rotulo: 'OAB (número/UF)', grupo: 'Identificação', exemplo: '000.000/SP' },
  { chave: 'advogada_qualificacao', rotulo: 'Qualificação (nacionalidade, estado civil)', grupo: 'Identificação', exemplo: 'brasileira, solteira' },
  { chave: 'email', rotulo: 'E-mail profissional', grupo: 'Identificação', exemplo: 'laracafe.adv@gmail.com' },
  { chave: 'telefone', rotulo: 'Telefone / WhatsApp', grupo: 'Identificação', exemplo: '(71) 99381-2266' },
  { chave: 'endereco', rotulo: 'Endereço profissional completo', grupo: 'Identificação', exemplo: 'Rua…, nº…, bairro, cidade/UF, CEP' },
  { chave: 'cidade_foro', rotulo: 'Cidade para foro e assinatura', grupo: 'Identificação', exemplo: 'Salvador/BA' },
  { chave: 'proposta_valor', rotulo: 'Proposta única de valor', grupo: 'Posicionamento', exemplo: 'Eu ajudo mulheres a atravessar a separação com segurança, por meio de uma advocacia humana e estratégica, sem reviver o desgaste do conflito.' },
  { chave: 'tom_de_voz', rotulo: 'Tom de voz nas mensagens', grupo: 'Posicionamento', exemplo: 'Acolhedor; sem ponto final no fim das mensagens; emoji 🤍 com moderação' },
  { chave: 'nao_atende', rotulo: 'Casos que não atendo (e para onde encaminho)', grupo: 'Posicionamento', exemplo: 'Violência doméstica: encaminho a uma parceira; trabalhista e previdenciário' },
  { chave: 'valor_consulta', rotulo: 'Valor da consulta', grupo: 'Consulta', exemplo: 'R$ 350,00' },
  { chave: 'consulta_abatida', rotulo: 'Consulta abatida dos honorários?', grupo: 'Consulta', exemplo: 'sim' },
  { chave: 'duracao_consulta', rotulo: 'Duração média da consulta', grupo: 'Consulta', exemplo: '60 minutos' },
  { chave: 'plataforma_consulta', rotulo: 'Plataforma da videochamada', grupo: 'Consulta', exemplo: 'Google Meet' },
  { chave: 'horario_atendimento', rotulo: 'Horário de atendimento', grupo: 'Consulta', exemplo: 'segunda a sexta, das 9h às 18h' },
  { chave: 'chave_pix', rotulo: 'Chave PIX', grupo: 'Pagamento', exemplo: 'CNPJ ou e-mail' },
  { chave: 'dados_bancarios', rotulo: 'Conta para depósito', grupo: 'Pagamento', exemplo: 'Banco, agência, conta, titular' },
  { chave: 'link_avaliacao', rotulo: 'Link de avaliação no Google', grupo: 'Pagamento', exemplo: 'https://g.page/…' },
] as const
export type ChaveEscritorio = typeof ESCRITORIO_CAMPOS[number]['chave']
export type Escritorio = Partial<Record<ChaveEscritorio, string>> & Record<string, string | undefined>

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

/**
 * Atuação da demanda. Consultiva = orientação/parecer; documental = elaboração de documentos (pacto, testamento, contratos);
 * extrajudicial e judicial = há procedimento/processo. Uma demanda consultiva/documental pode evoluir: ao registrar
 * o processo ou procedimento, a atuação acompanha (e a mudança fica no histórico).
 */
export const TIPOS_DEMANDA = { consultivo: 'Consultiva', documental: 'Documental', extrajudicial: 'Extrajudicial', judicial: 'Judicial' } as const
export const STATUS_DEMANDA = { ativo: 'Ativo', suspenso: 'Suspenso', encerrado: 'Encerrado' } as const
export const FASES_PROCESSUAIS = ['Postulatória (petição inicial)', 'Instrução', 'Sentença', 'Recurso', 'Execução/cumprimento de sentença', 'Arquivado aguardando'] as const

// Tarefas internas do escritório, sem vínculo com cliente ou caso.
export const PRIORIDADES_TAREFA = { baixa: 'Baixa', media: 'Média', alta: 'Alta' } as const
export interface TarefaInterna {
  id: number
  titulo: string
  descricao: string | null
  concluida: boolean
  /** Data da tarefa (AAAA-MM-DD). Obrigatória: é o que separa "hoje" de "depois". */
  prazo: string
  prioridade: keyof typeof PRIORIDADES_TAREFA
  contato_id: number | null
  caso_id: number | null
  processo_id?: number | null
  created_at: string
  updated_at: string
  contato?: Pick<Contato, 'id' | 'nome'> | null
  caso?: Pick<Demanda, 'id' | 'titulo'> | null
}
/**
 * Demanda/serviço contratado por um cliente (tabela `casos`, nome mantido por compatibilidade).
 * `tipo` é a atuação da demanda: consultiva/documental (sem processo), extrajudicial ou judicial.
 * Os dados formais (número, órgão, fase…) ficam nos Processos/Procedimentos da demanda.
 */
export interface Demanda {
  id: number
  created_at: string
  contato_id: number
  titulo: string
  area: string | null
  tipo: keyof typeof TIPOS_DEMANDA
  status: keyof typeof STATUS_DEMANDA
  data_abertura: string
  data_encerramento: string | null
  observacoes: string | null
  resultado?: keyof typeof RESULTADOS_DEMANDA | null
  /** 'servico/variante' do Padrão Operacional; define as etapas do checklist da demanda. */
  procedimento?: string | null
  /** Análise jurídica do escritório (estratégia, fundamentos), separada das respostas do formulário. */
  /** Análise profissional (escritório): fundamentos/raciocínio, fatos, estratégia, riscos, conclusão e decisão. */
  analise?: string | null
  fatos?: string | null
  estrategia?: string | null
  conclusao?: string | null
  riscos?: string | null
  decisao?: keyof typeof DECISOES_DEMANDA | null
  responsavel_id?: string | null
  updated_at?: string
  contato?: Pick<Contato, 'id' | 'nome'> | null
  processos?: Pick<Processo, 'id' | 'natureza' | 'numero' | 'orgao' | 'fase' | 'status'>[]
  partes?: Pick<Parte, 'id' | 'nome' | 'papel'>[]
}
export const DEMANDA_CAMPOS = ['contato_id', 'titulo', 'area', 'tipo', 'status', 'data_abertura', 'data_encerramento', 'observacoes', 'resultado', 'procedimento', 'analise', 'fatos', 'estrategia', 'conclusao', 'riscos', 'decisao', 'responsavel_id'] as const
/** Anotação datada da análise profissional (o raciocínio evolui; nada se sobrescreve). */
export const TIPOS_NOTA_DEMANDA = { anotacao: 'Anotação', conclusao: 'Conclusão', observacao: 'Observação' } as const
export interface DemandaNota { id: number; created_at: string; caso_id: number; tipo: keyof typeof TIPOS_NOTA_DEMANDA; texto: string; autor_id: string | null; autor_nome?: string | null }
/** Decisão do escritório depois de analisar a demanda (não é resposta de formulário). */
export const DECISOES_DEMANDA = {
  viavel: { nome: 'Viável', dica: 'Seguir para a proposta.' },
  ressalvas: { nome: 'Viável com ressalvas', dica: 'Deixe os riscos por escrito na proposta.' },
  inviavel: { nome: 'Não viável', dica: 'Explique com transparência e encerre ou indique outro caminho.' },
} as const

// ─── Processo (judicial) ou Procedimento (extrajudicial) de uma demanda ────────────────────
export const NATUREZAS_PROCESSO = { judicial: 'Processo judicial', extrajudicial: 'Procedimento extrajudicial' } as const
export const FASES_EXTRAJUDICIAIS = ['Preparação', 'Protocolo / agendamento', 'Aguardando cartório', 'Lavratura / assinatura', 'Registro / averbação'] as const
export interface Processo {
  responsavel_id?: string | null
  desfecho?: string | null
  responsavel_nome?: string | null
  tipo_procedimento?: string | null
  id: number
  created_at: string
  caso_id: number
  contato_id: number
  natureza: keyof typeof NATUREZAS_PROCESSO
  numero: string | null
  tribunal?: string | null
  orgao: string | null
  comarca: string | null
  uf: string | null
  fase: string | null
  status: keyof typeof STATUS_DEMANDA
  valor: number | null
  link: string | null
  data_inicio: string
  data_encerramento: string | null
  observacoes: string | null
  caso?: Pick<Demanda, 'id' | 'titulo' | 'tipo'> | null
  contato?: Pick<Contato, 'id' | 'nome'> | null
}
export const PROCESSO_CAMPOS = ['caso_id', 'natureza', 'numero', 'responsavel_nome', 'tipo_procedimento', 'tribunal', 'orgao', 'comarca', 'uf', 'fase', 'status', 'valor', 'link', 'data_inicio', 'data_encerramento', 'observacoes', 'responsavel_id'] as const

// ─── Partes e interessados de uma demanda ───────────────────────────────────────────────────
export const PAPEIS_PARTE = ['Parte contrária', 'Cônjuge / companheiro(a)', 'Herdeiro', 'Inventariante', 'Interessado', 'Testemunha', 'Advogado da parte contrária', 'Outro'] as const
export interface Parte {
  id: number
  created_at: string
  caso_id: number
  contato_id: number | null
  nome: string
  papel: string
  polo?: 'ativo' | 'passivo' | null
  processo_id?: number | null
  documento: string | null
  telefone: string | null
  email: string | null
  observacao: string | null
  contato?: { id: number; nome: string | null; etapa: string } | null
}
export const PARTE_CAMPOS = ['caso_id', 'contato_id', 'nome', 'papel', 'polo', 'processo_id', 'documento', 'telefone', 'email', 'observacao'] as const

// ─── Movimentações (andamentos) de um processo/procedimento ────────────────────────────────
export const TIPOS_MOVIMENTACAO = ['Andamento', 'Petição / protocolo', 'Decisão / despacho', 'Publicação / intimação', 'Audiência / ato', 'Registro / certidão', 'Conclusão', 'Outro'] as const
export interface Movimentacao {
  id: number
  created_at: string
  processo_id: number
  data: string
  tipo: string
  texto: string
}

/** Resultado do caso encerrado (base da taxa de êxito no painel de qualidade). */
export const RESULTADOS_DEMANDA = { exito: 'Êxito', acordo: 'Acordo', parcial: 'Êxito parcial', sem_exito: 'Sem êxito', desistencia: 'Desistência do cliente' } as const

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
  caso?: (Pick<Demanda, 'id' | 'titulo'> & { numero_processo?: string | null }) | null
  processo_id?: number | null
  processo?: { id: number; numero: string | null; natureza: string } | null
}
export const COMPROMISSO_CAMPOS = ['tipo', 'titulo', 'contato_id', 'caso_id', 'processo_id', 'inicio', 'data_limite', 'data_publicacao', 'dias_prazo', 'local', 'status', 'observacao'] as const

/** Onde uma data (de tarefa ou prazo) está em relação a hoje — mesmo critério em Hoje, Tarefas e Prazos. */
export type SituacaoData = 'atrasado' | 'hoje' | 'futuro'
export function situacaoData(data: string, hoje: string): SituacaoData {
  return data < hoje ? 'atrasado' : data === hoje ? 'hoje' : 'futuro'
}

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

// ─── Mapa da Empatia (playbook "Mapa da Empatia") ───────────────────────────
export const MAPA_EMPATIA = [
  { chave: 'mapa_quem', bloco: 'Quem ela é', pergunta: 'Idade, cidade, momento de vida (casada, com filhos, em separação…).' },
  { chave: 'mapa_fala', bloco: 'O que ela fala', pergunta: 'Assuntos que comenta, conteúdos que consome, perguntas que faz antes de procurar uma advogada.' },
  { chave: 'mapa_sente', bloco: 'O que ela sente', pergunta: 'Emoções predominantes; como se sente para resolver sozinha e para procurar ajuda.' },
  { chave: 'mapa_pensa', bloco: 'O que ela pensa', pergunta: 'Medos e crenças sobre advogados e a Justiça; o que passa pela cabeça antes de contratar.' },
  { chave: 'mapa_faz', bloco: 'O que ela faz', pergunta: 'Onde busca informação (Google, Instagram, amigas, grupos) e o que já tentou sozinha.' },
  { chave: 'mapa_objetivos', bloco: 'Objetivos', pergunta: 'O que quer alcançar: recomeçar, proteger os filhos, fechar um capítulo…' },
  { chave: 'mapa_dores', bloco: 'Dores', pergunta: 'O que mais dói além da questão jurídica: dinheiro, emoção, informação, tempo.' },
] as const

// ─── Gestão: fluxo da equipe, precificação e financeiro ─────────────────────
export const CHAVES_GESTAO = ['horas_produtivas_mes', 'margem_desejada', 'saldo_caixa', 'pro_labore', 'horas_estimadas'] as const
export const CHAVES_EXTRAS: string[] = [
  ...MAPA_EMPATIA.map(m => m.chave),
  ...CHAVES_GESTAO,
]

export const CATEGORIAS_LANCAMENTO = {
  receber: ['Honorários', 'Consulta', 'Êxito', 'Reembolso de custas', 'Outros'],
  pagar: ['Aluguel e condomínio', 'Salários e pró-labore', 'Software e sistemas', 'Marketing', 'Impostos e OAB', 'Custas do cliente', 'Contador', 'Outros'],
} as const

export interface Lancamento {
  id: number
  tipo: 'receber' | 'pagar'
  descricao: string
  categoria: string
  valor: number
  vencimento: string
  pago_em: string | null
  recorrente: boolean
  contato_id: number | null
  caso_id: number | null
  honorario_id: number | null
  observacao: string | null
  contato?: Pick<Contato, 'id' | 'nome'> | null
}
export const LANCAMENTO_CAMPOS = ['tipo', 'descricao', 'categoria', 'valor', 'vencimento', 'pago_em', 'recorrente', 'contato_id', 'caso_id', 'observacao'] as const

/** Preço mínimo = horas estimadas × custo da hora × (1 + margem). */
export function precoMinimo(horas: number, custoHora: number, margemPct: number) {
  return Math.ceil((horas * custoHora * (1 + margemPct / 100)) / 10) * 10
}

// ─── Qualidade: revisão interna por amostragem ──────────────────────────────
export const ITENS_REVISAO = [
  { chave: 'prazos', rotulo: 'Prazos em dia e cadastrados na agenda' },
  { chave: 'proxima_acao', rotulo: 'Próxima ação definida e com data' },
  { chave: 'cliente_informado', rotulo: 'Cliente atualizada nos últimos 30 dias' },
  { chave: 'documentos', rotulo: 'Documentos completos e organizados' },
  { chave: 'pecas', rotulo: 'Última peça relida no dia seguinte, antes de protocolar' },
  { chave: 'financeiro', rotulo: 'Honorários e custas em dia' },
] as const
export type ResultadoItem = 'ok' | 'falha' | 'na'
export interface Revisao {
  id: number
  created_at: string
  caso_id: number
  revisor_id: string | null
  itens: Record<string, ResultadoItem>
  aprovado: boolean
  observacao: string | null
  plano_acao: string | null
  caso?: Pick<Demanda, 'id' | 'titulo'> & { contato?: Pick<Contato, 'id' | 'nome'> | null } | null
  revisor?: { name: string } | null
}


// ─── Gestão de conhecimento: pasta do cliente no Google Drive ──────────────
/** Estrutura fixa de toda pasta de cliente (a numeração mantém a ordem no Drive). */
export const ESTRUTURA_PASTA_CLIENTE = [
  { chave: 'recebidos', nome: '00 Recebidos pelo WhatsApp' },
  { chave: 'pessoais', nome: '01 Documentos pessoais' },
  { chave: 'contrato', nome: '02 Contrato, procuração e honorários' },
  { chave: 'pecas', nome: '03 Peças e petições' },
  { chave: 'provas', nome: '04 Provas e documentos do caso' },
  { chave: 'comunicacoes', nome: '05 Comunicações e atas' },
  { chave: 'financeiro', nome: '06 Financeiro' },
  { chave: 'arquivo', nome: '99 Arquivo (versões antigas)' },
] as const
export type SubpastaCliente = typeof ESTRUTURA_PASTA_CLIENTE[number]['chave']

/** Código estável do cliente, usado em pastas e nomes de arquivo (não expõe CPF nem nome completo). */
export const codigoCliente = (id: number) => `CLI-${String(id).padStart(4, '0')}`

export const NIVEIS_SIGILO = {
  interno: 'Interno',
  confidencial: 'Confidencial',
  sigiloso: 'Sigiloso (segredo de justiça)',
} as const

/** Nome padrão: AAAA-MM-DD_CLI-0005_TIPO_descricao_v01.ext (sem acentos nem espaços). */
export function nomeArquivoPadrao(o: { data: string; contatoId: number; tipo: string; descricao?: string | null; versao?: number; extensao: string }) {
  const limpar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const partes = [o.data, codigoCliente(o.contatoId), limpar(o.tipo).toUpperCase()]
  if (o.descricao) partes.push(limpar(o.descricao).toLowerCase().slice(0, 40))
  partes.push(`v${String(o.versao ?? 1).padStart(2, '0')}`)
  return `${partes.join('_')}.${o.extensao}`
}


// ─── Intimações (registro manual) de um processo judicial ──────────────────────────────────
export const TIPOS_INTIMACAO = ['Despacho', 'Decisão', 'Sentença', 'Citação', 'Intimação para manifestação', 'Audiência designada', 'Publicação no Diário', 'Outro'] as const
export const STATUS_INTIMACAO = { a_tratar: 'A tratar', tratada: 'Tratada' } as const
export interface Intimacao {
  id: number
  created_at: string
  processo_id: number
  caso_id: number
  contato_id: number
  data_publicacao: string
  tipo: typeof TIPOS_INTIMACAO[number]
  conteudo: string | null
  dias_prazo: number | null
  compromisso_id: number | null
  tarefa_id: number | null
  status: keyof typeof STATUS_INTIMACAO
  tratada_em: string | null
  tratada_obs: string | null
  processo?: { id: number; numero: string | null; tribunal: string | null; orgao: string | null; status: string } | null
  caso?: { id: number; titulo: string } | null
  contato?: { id: number; nome: string | null } | null
  compromisso?: { id: number; data_limite: string | null; status: string } | null
  tarefa?: { id: number; prazo: string; concluida: boolean } | null
}
