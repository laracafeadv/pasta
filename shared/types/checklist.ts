// Checklist operacional da ficha: a mesma estrutura serve ao atendimento (cliente) e a cada caso.

export interface ItemChecklist {
  chave: string
  /** Grupo em que o item aparece (fase do Padrão Operacional ou "Etapas do procedimento"). */
  fase: string
  titulo: string
  /** auto = calculado de dados que o CRM já tem (não dá para marcar à mão); manual = você marca. */
  tipo: 'auto' | 'manual'
  concluido: boolean
  /** Quando foi concluído (ISO), se houver data. */
  quando: string | null
  quem: string | null
  /** De onde vem o "feito" (itens automáticos) ou o quanto falta. */
  evidencia: string | null
  dica: string
  /** Texto do passo, para expandir quando precisar. */
  detalhe?: string
}

export interface ChecklistEscopo {
  titulo: string
  casoId: number | null
  itens: ItemChecklist[]
  feitos: number
  total: number
}

export interface ChecklistFicha {
  atendimento: ChecklistEscopo | null
  casos: Record<number, ChecklistEscopo>
}
