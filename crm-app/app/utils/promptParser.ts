export interface PromptSection {
  id: string
  title: string
  content: string
  isStrategic: boolean
}

export const STRATEGIC_SECTIONS = [
  'identidade',
  'comunicacao',
  'objetivo',
]

const SECTION_TITLES: Record<string, string> = {
  'identidade': 'Quem é a assistente',
  'areas': 'Áreas de atuação',
  'comunicacao': 'Tom de voz',
  'objetivo': 'Roteiro da conversa',
  'atendimento': 'Como funciona o atendimento',
  'valores': 'Valores e formas de pagamento',
  'horarios': 'Horários e agenda',
  'documentos': 'Documentos que costumamos pedir',
  'respostas-padrao': 'Respostas prontas',
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
