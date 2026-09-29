// Dashboard: tudo é derivado de dados que o CRM já tem (nada é cadastrado só para ele).

export type Severidade = 'urgente' | 'atrasado' | 'atencao'
export type GrupoAtencao = 'prazos' | 'tarefas' | 'clientes'
export type OrigemAtencao =
  | 'prazo' | 'compromisso' | 'tarefa' | 'retorno' | 'resposta'
  | 'sugestao' | 'formulario' | 'formulario_pendente' | 'sem_acao' | 'documentos'

export interface ItemAtencao {
  id: string
  grupo: GrupoAtencao
  origem: OrigemAtencao
  severidade: Severidade
  titulo: string
  detalhe: string
  /** AAAA-MM-DD, quando o item tem data. */
  data: string | null
  contatoId: number | null
  tarefaId?: number
  compromissoId?: number
  /** Módulo completo onde o item vive. */
  link: string
  /** Aba da ficha a abrir (conversa, casos, documentos…). */
  aba?: string
}

export interface EventoAgenda {
  id: string
  tipo: string
  titulo: string
  dia: string
  hora: string | null
  contato: { id: number; nome: string | null } | null
  caso: string | null
  local: string | null
  compromissoId: number
  ehPrazo: boolean
}

export interface DiaCarga { dia: string; prazos: number; compromissos: number; tarefas: number }
export interface CasoAndamento {
  id: number
  titulo: string
  contato: { id: number; nome: string | null } | null
  fase: string | null
  proximoPrazo: { data: string; titulo: string } | null
  tarefasAbertas: number
}
export interface AtividadeRecente {
  id: number
  quando: string
  tipo: string
  texto: string
  sistema: boolean
  contato: { id: number; nome: string | null } | null
}

export interface DashboardData {
  geradoEm: string
  hoje: string
  papel: 'admin' | 'equipe'
  dias: number
  resumo: {
    hoje: { total: number; tarefas: number; prazos: number; compromissos: number; retornos: number }
    atrasado: { total: number; tarefas: number; prazos: number; compromissos: number; retornos: number }
    proximos7: { total: number; tarefas: number; prazos: number; compromissos: number }
    carteira: { clientesAtivos: number; casosAtivos: number; casosSuspensos: number; leadsAbertos: number }
    abertas: { tarefas: number; prazos: number; documentosClientes: number; propostas: number; propostasValor: number }
    /** Mesma conta do número no menu "Hoje". */
    pendencias: number
  }
  atencao: ItemAtencao[]
  agenda: EventoAgenda[]
  carga: { atrasado: Omit<DiaCarga, 'dia'>; dias: DiaCarga[] }
  funil: { id: string; nome: string; total: number }[]
  casosAndamento: CasoAndamento[]
  periodo: {
    novosContatos: number
    consultasPagas: number
    contratos: { total: number; valor: number }
    tarefasConcluidas: number
    prazosCumpridos: number
  }
  /** Só para administração. */
  financeiro: {
    recebidoMes: number
    aReceber30d: number
    emAtraso: number
    porMes: { mes: string; recebido: number }[]
  } | null
  atividade: AtividadeRecente[]
}
