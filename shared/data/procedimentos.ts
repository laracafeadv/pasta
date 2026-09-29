// Processo JUDICIAL e procedimento EXTRAJUDICIAL compartilham a tabela `processos` (infraestrutura), mas têm
// fluxos próprios: o judicial anda por fases e movimentações; o extrajudicial por ETAPAS formais, PENDÊNCIAS
// (exigências) e conclusão do ato. Este arquivo define o que é específico de cada um.

// ─── Extrajudicial: tipos de procedimento e suas etapas formais (execução no cartório/órgão) ─────
export interface EtapaModelo { titulo: string; dica?: string; opcional?: boolean }
export interface TipoProcedimento { id: string; nome: string; servicos: string[]; etapas: EtapaModelo[] }

export const TIPOS_PROCEDIMENTO_EXTRAJUDICIAL: TipoProcedimento[] = [
  {
    id: 'inventario', nome: 'Inventário extrajudicial (escritura)', servicos: ['inventario'],
    etapas: [
      { titulo: 'Protocolo / agendamento no tabelionato', dica: 'Qualquer tabelionato do país, presencial ou pelo e-notariado.' },
      { titulo: 'Análise da documentação e exigências do tabelionato' },
      { titulo: 'ITCMD: declaração e recolhimento (SEFAZ)', dica: 'Se houver parcelamento, o inventário só finaliza depois da quitação total.' },
      { titulo: 'Minuta aprovada pelos herdeiros' },
      { titulo: 'Lavratura e assinatura da escritura' },
      { titulo: 'Registro / averbação (RGI, DETRAN, Junta Comercial)', dica: 'Imóveis, veículos e empresas conforme os bens.' },
      { titulo: 'Entrega da escritura e das certidões' },
    ],
  },
  {
    id: 'divorcio', nome: 'Divórcio / dissolução extrajudicial (escritura)', servicos: ['divorcio', 'dissolucao-ue'],
    etapas: [
      { titulo: 'Protocolo / agendamento no tabelionato' },
      { titulo: 'Análise da documentação e exigências do tabelionato' },
      { titulo: 'SEFAZ: imposto sobre partilha desigual', opcional: true, dica: 'Só se houver partilha desigual.' },
      { titulo: 'Minuta aprovada pelos cônjuges' },
      { titulo: 'Lavratura e assinatura da escritura' },
      { titulo: 'Averbações (Registro Civil, RGI, DETRAN)', dica: 'Divórcio na certidão de casamento; retorno ao nome de solteiro(a), se houver.' },
      { titulo: 'Entrega da escritura e das certidões' },
    ],
  },
  {
    id: 'pacto', nome: 'Pacto antenupcial / contrato de convivência (escritura)', servicos: ['pacto-antenupcial', 'registro-ue', 'planejamento'],
    etapas: [
      { titulo: 'Minuta aprovada pelo casal' },
      { titulo: 'Protocolo / agendamento no tabelionato' },
      { titulo: 'Lavratura e assinatura da escritura' },
      { titulo: 'Registro do pacto (RGI do domicílio, após o casamento)', opcional: true },
      { titulo: 'Entrega da escritura e das certidões' },
    ],
  },
  {
    id: 'registro', nome: 'Registro / averbação / retificação', servicos: ['casamento', 'alteracao-nome', 'alteracao-regime-bens', 'doacao', 'testamento', 'adocao', 'guarda-alimentos'],
    etapas: [
      { titulo: 'Protocolo no cartório / órgão' },
      { titulo: 'Análise e exigências' },
      { titulo: 'Pagamento de emolumentos / taxas' },
      { titulo: 'Registro / averbação concluído' },
      { titulo: 'Entrega do documento' },
    ],
  },
  {
    id: 'outro', nome: 'Outro procedimento extrajudicial', servicos: [],
    etapas: [{ titulo: 'Protocolo' }, { titulo: 'Análise e exigências' }, { titulo: 'Conclusão do ato' }],
  },
]
export const tipoProcedimentoPorNome = (nome: string | null | undefined) => TIPOS_PROCEDIMENTO_EXTRAJUDICIAL.find(t => t.nome === nome)
export const sugerirTipoProcedimento = (servicoId: string | null | undefined) => TIPOS_PROCEDIMENTO_EXTRAJUDICIAL.find(t => servicoId && t.servicos.includes(servicoId)) ?? null

export const STATUS_ETAPA = { pendente: 'Pendente', concluida: 'Concluída', dispensada: 'Dispensada' } as const
export interface ProcessoEtapa { id: number; processo_id: number; ordem: number; titulo: string; status: keyof typeof STATUS_ETAPA; data_prevista: string | null; concluida_em: string | null; observacao: string | null }
/** Etapa em andamento = a primeira ainda pendente. Sem nenhuma pendente, todas foram cumpridas ou dispensadas. */
export function etapaAtual(etapas: Pick<ProcessoEtapa, 'ordem' | 'status' | 'titulo'>[]): string | null {
  const ordenadas = [...etapas].sort((a, b) => a.ordem - b.ordem)
  return ordenadas.find(e => e.status === 'pendente')?.titulo ?? null
}

// ─── Pendências / exigências (o que trava o andamento e quem precisa resolver) ─────────────────
export const AGUARDANDO_PENDENCIA = { cliente: 'Cliente', orgao: 'Cartório / órgão / juízo', escritorio: 'Escritório', terceiro: 'Terceiro' } as const
export interface ProcessoPendencia { id: number; processo_id: number; descricao: string; aguardando: keyof typeof AGUARDANDO_PENDENCIA; prazo: string | null; resolvida_em: string | null; observacao: string | null; created_at?: string }

// ─── Desfecho (conclusão) — próprio de cada natureza ───────────────────────────────────────────
export interface Desfecho { valor: string; sucesso: boolean }
export const DESFECHOS_JUDICIAL: Desfecho[] = [
  { valor: 'Sentença procedente', sucesso: true }, { valor: 'Sentença procedente em parte', sucesso: true }, { valor: 'Sentença improcedente', sucesso: false },
  { valor: 'Acordo homologado', sucesso: true }, { valor: 'Partilha homologada (sentença / formal de partilha)', sucesso: true },
  { valor: 'Extinto sem resolução do mérito', sucesso: false }, { valor: 'Desistência', sucesso: false }, { valor: 'Arquivado', sucesso: false },
]
export const DESFECHOS_EXTRAJUDICIAL: Desfecho[] = [
  { valor: 'Escritura lavrada', sucesso: true }, { valor: 'Escritura lavrada e registrada / averbada', sucesso: true }, { valor: 'Registro / averbação concluído', sucesso: true },
  { valor: 'Desistência das partes', sucesso: false }, { valor: 'Cancelado', sucesso: false }, { valor: 'Convertido em processo judicial', sucesso: false },
]
export const desfechosDa = (natureza: string) => (natureza === 'judicial' ? DESFECHOS_JUDICIAL : DESFECHOS_EXTRAJUDICIAL)

// ─── Partes e interessados: papéis próprios de cada natureza ───────────────────────────────────
export const PAPEIS_JUDICIAL = ['Autor / Requerente', 'Réu / Requerido', 'Inventariante', 'Herdeiro', 'Meeiro / cônjuge sobrevivente', 'Terceiro interessado', 'Advogado da parte contrária', 'Ministério Público', 'Testemunha']
export const PAPEIS_EXTRAJUDICIAL = ['Outorgante / interessado', 'Cônjuge / companheiro(a)', 'Inventariante', 'Herdeiro', 'Meeiro / cônjuge sobrevivente', 'Procurador', 'Testemunha', 'Escrevente / contato no cartório']
export const POLOS_PARTE = { ativo: 'Polo ativo', passivo: 'Polo passivo' } as const
