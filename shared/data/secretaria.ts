/** Atalhos que a Secretária mostra por padrão. Os de TJ e Justiça Federal ficam sem endereço: a própria usuária preenche. */
export interface AtalhoSecretaria { id: string; nome: string; url: string }
export const ATALHOS_PADRAO: AtalhoSecretaria[] = [
  { id: 'eproc-tj', nome: 'eproc / PJe do TJ', url: '' },
  { id: 'pje-trt', nome: 'PJe do TRT5', url: 'https://pje.trt5.jus.br' },
  { id: 'eproc-jf', nome: 'eproc da Justiça Federal', url: '' },
  { id: 'inss', nome: 'Meu INSS', url: 'https://meu.inss.gov.br' },
  { id: 'djen', nome: 'DJEN', url: 'https://comunica.pje.jus.br' },
  { id: 'whats', nome: 'WhatsApp Web', url: 'https://web.whatsapp.com' },
]
export interface ConfigSecretaria { tribunal: 'tjba' | 'trt5' | 'jf' | 'nac'; pontos_facultativos: boolean; cidade: string; atalhos: AtalhoSecretaria[] }
export const CONFIG_PADRAO: ConfigSecretaria = { tribunal: 'tjba', pontos_facultativos: false, cidade: 'Salvador', atalhos: ATALHOS_PADRAO }
export interface LembreteRapido { id: number; texto: string; data: string | null; hora: string | null; feito: boolean; feito_em: string | null; item_id: number | null }
export interface SuspensaoExpediente { id: number; de: string; ate: string; tribunal: 'todos' | 'tjba' | 'trt5' | 'jf'; motivo: string | null }
/** Um item da agenda PRÓPRIA da Secretária (não depende das telas de Agenda/Prazos/Tarefas do CRM). */
export interface ItemAgenda { id: number; tipo: 'prazo' | 'audiencia' | 'consulta' | 'compromisso' | 'tarefa'; titulo: string; dia: string; hora: string | null; local: string | null; cliente: string | null; obs: string | null; meu: boolean }
export interface InicioSecretaria { hoje: string; config: ConfigSecretaria; lembretes: LembreteRapido[]; suspensoes: SuspensaoExpediente[]; eventos: ItemAgenda[] }

/** Conexão com a conta Google (Gmail e Agenda) e o que vem dela. */
export interface GoogleStatus { configurado: boolean; conectado: boolean; email: string | null; redirectUri?: string }
export interface AvisoItem { id: string; tribunal: string; chave: 'tjba' | 'trt5' | 'jf' | 'nac'; cnj: string; movimentacao: string; dataMov: string; dataEmail: string; intimacao: boolean; quando: string; link: string; naoLida: boolean }
export interface AvisoLancado { prazo: string; evento_link: string | null }
export interface MailItem { id: string; de: string; assunto: string; previa: string; quando: string; naoLida: boolean; link: string }
export type CaixaSub = 'principal' | 'naolidos' | 'tudo'

/** Lead da aba Leads da Secretária (tabela secretaria_leads). */
export type EtapaLead = 'novo' | 'consulta' | 'proposta' | 'fechou' | 'nao_fechou'
export type OrigemLead = 'Instagram' | 'Indicação' | 'Google' | 'WhatsApp' | 'Outro'
export interface LeadSecretaria {
  id: number; created_at: string; updated_at: string; nome: string; whatsapp: string | null; origem: OrigemLead; origem_detalhe: string | null
  area: string | null; cidade: string | null; data_contato: string; etapa: EtapaLead; conversa: 'minha' | 'cliente'; conversa_desde: string
  caso: string | null; consulta_data: string | null; consulta_hora: string | null; consulta_link: string | null
  honorarios_prop: number | null; valor_fechado: number | null; exito: number | null; motivo_nao_fechou: string | null; proximo_passo: string | null; obs: string | null
}
export type LeadEntrada = Partial<Omit<LeadSecretaria, 'id' | 'created_at' | 'updated_at'>>
export interface ConsultaNaAgenda { st: 'verde' | 'amarelo' | 'vermelho' | 'erro'; dia?: string; hora?: string; link?: string; msg?: string }
