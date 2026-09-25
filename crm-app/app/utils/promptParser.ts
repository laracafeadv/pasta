export interface PromptSection {
  id: string
  title: string
  content: string
  isStrategic: boolean
}

export const STRATEGIC_SECTIONS = [
  'identidade',
  'ferramentas',
  'proibicoes',
  'comunicacao'
]

const SECTION_TITLES: Record<string, string> = {
  'identidade': 'Identidade & Personalidade',
  'comunicacao': 'Estilo de Comunicação',
  'long-memory': 'Memória de Longo Prazo',
  'ferramentas': 'Capacidades e Ferramentas',
  'ferramenta-dados': 'Base de Dados (RAG)',
  'protocolo-transferencia': 'Escalonamento Humano',
  'fluxo-voos': 'Processo de Voos',
  'fluxo-hotel': 'Processo de Hotéis',
  'respostas-padrao': 'Respostas Pré-definidas',
  'proibicoes': 'Restrições Críticas',
  'seguranca': 'Segurança e Dados'
}

export function parsePrompt(content: string): PromptSection[] {
  const sections: PromptSection[] = []
  const regex = /<([\w-]+)>([\s\S]*?)<\/\1>/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const id = match[1]
    if (!id) continue
    
    sections.push({
      id,
      title: SECTION_TITLES[id] || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      content: (match[2] || '').trim(),
      isStrategic: STRATEGIC_SECTIONS.includes(id)
    })
  }

  return sections
}

export function generatePrompt(sections: PromptSection[]): string {
  return sections
    .map(s => `<${s.id}>\n${s.content}\n</${s.id}>`)
    .join('\n\n')
}
