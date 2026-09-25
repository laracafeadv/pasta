import { serverSupabaseServiceRole } from '#supabase/server'
import { MAPA_EMPATIA } from '../../../shared/types/crm'
import { requireAdmin } from '../../utils/security'
import { criarOpenAI } from '../../utils/agente'
import { carregarEscritorio } from '../../utils/escritorio'
import { carregarVozes } from '../../utils/mapa'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['padroes', 'frases', 'sugestoes'],
  properties: {
    padroes: { type: 'array', items: { type: 'string' } },
    frases: { type: 'array', items: { type: 'string' } },
    sugestoes: {
      type: 'object',
      additionalProperties: false,
      required: MAPA_EMPATIA.map(m => m.chave),
      properties: Object.fromEntries(MAPA_EMPATIA.map(m => [m.chave, { type: ['string', 'null'] }])),
    },
  },
} as const

/**
 * Fecha o ciclo do playbook: compara o mapa "de cabeça" com o que as clientes disseram
 * de verdade e sugere atualizações + frases na língua delas. Envia só frases anônimas.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event, 'mapa/analisar')
  const admin = serverSupabaseServiceRole(event)
  const vozes = await carregarVozes(admin)
  if (vozes.total < 3) throw createError({ statusCode: 400, message: 'Ainda há poucas conversas registradas para encontrar padrões (mínimo 3).' })
  const e = await carregarEscritorio(admin)
  const mapaAtual = MAPA_EMPATIA.map(m => `- ${m.bloco}: ${e[m.chave] || '(vazio)'}`).join('\n')
  const dados = [
    `Dores ditas pelas clientes:\n${vozes.dores.map((d) => `- ${d.texto}`).join('\n') || '-'}`,
    `Objetivos ditos:\n${vozes.objetivos.map((d) => `- ${d.texto}`).join('\n') || '-'}`,
    `Objeções mais comuns: ${vozes.objecoes.map(([k, n]) => `${k} (${n})`).join('; ') || '-'}`,
    `Demandas mais comuns: ${vozes.demandas.map(([k, n]) => `${k} (${n})`).join('; ') || '-'}`,
  ].join('\n\n')

  const { openai, modelo } = criarOpenAI()
  const r = await openai.chat.completions.create({
    model: modelo,
    temperature: 0.3,
    max_tokens: 1200,
    messages: [
      { role: 'system', content: 'Você ajuda uma advogada de Família e Sucessões a atualizar o Mapa da Empatia da cliente ideal com dados reais. Seja fiel aos dados: não invente fatos. Respeite o Provimento 205/2021 da OAB nas frases (sem promessa de resultado, sem sensacionalismo, sem captação indevida). Responda em português do Brasil.' },
      { role: 'user', content: `Mapa atual (escrito de cabeça):\n${mapaAtual}\n\nO que as clientes disseram de verdade:\n${dados}\n\nDevolva: (1) "padroes": até 5 padrões recorrentes; (2) "frases": 3 frases de comunicação para bio, post ou stories que falem com essa dor e esse momento de vida, na língua delas; (3) "sugestoes": para cada bloco do mapa, uma versão atualizada em 1 linha, ou null se os dados não permitem dizer nada novo.` },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'mapa_empatia', strict: true, schema: SCHEMA as any } },
  })
  try {
    return JSON.parse(r.choices[0]?.message?.content ?? '')
  } catch {
    throw createError({ statusCode: 502, message: 'A IA não conseguiu analisar agora. Tente de novo.' })
  }
})
