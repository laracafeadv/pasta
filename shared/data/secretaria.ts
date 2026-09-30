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
