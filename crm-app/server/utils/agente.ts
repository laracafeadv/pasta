import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AREAS, SENTIMENTOS, URGENCIAS, type Contato } from '../../shared/types/crm'
import { INSTRUCOES_SAIDA, PROMPT_PADRAO, REGRAS_FIXAS } from './agentePrompt'
import { blocoEscritorioParaAna, blocoMapaParaAna } from './escritorio'
import type { Escritorio } from '../../shared/types/crm'

export interface MensagemHistorico {
  autor: 'cliente' | 'ia' | 'equipe'
  conteudo: string
}

export interface FichaExtraida {
  nome: string | null
  cidade: string | null
  email: string | null
  area: string | null
  demanda: string | null
  resumo: string | null
  urgencia: typeof URGENCIAS[number] | null
  sentimento: typeof SENTIMENTOS[number] | null
  interesses: string[]
  objecoes: string[]
  parte_contraria: string | null
  periodo_preferido: 'manhã' | 'tarde' | null
  dor: string | null
  objetivo: string | null
}

export interface RespostaAgente {
  resposta: string
  ficha: FichaExtraida
  transferir_para_humano: boolean
  motivo_transferencia: string | null
}

const texto = { type: ['string', 'null'] }
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resposta', 'ficha', 'transferir_para_humano', 'motivo_transferencia'],
  properties: {
    resposta: { type: 'string' },
    ficha: {
      type: 'object',
      additionalProperties: false,
      required: ['nome', 'cidade', 'email', 'area', 'demanda', 'resumo', 'urgencia', 'sentimento', 'interesses', 'objecoes', 'parte_contraria', 'periodo_preferido', 'dor', 'objetivo'],
      properties: {
        nome: texto,
        cidade: texto,
        email: texto,
        area: { type: ['string', 'null'], enum: [...Object.keys(AREAS), null] },
        demanda: texto,
        resumo: texto,
        urgencia: { type: ['string', 'null'], enum: [...URGENCIAS, null] },
        sentimento: { type: ['string', 'null'], enum: [...SENTIMENTOS, null] },
        interesses: { type: 'array', items: { type: 'string' } },
        objecoes: { type: 'array', items: { type: 'string' } },
        parte_contraria: texto,
        periodo_preferido: { type: ['string', 'null'], enum: ['manhã', 'tarde', null] },
        dor: texto,
        objetivo: texto,
      },
    },
    transferir_para_humano: { type: 'boolean' },
    motivo_transferencia: texto,
  },
} as const

export function criarOpenAI(): { openai: OpenAI; modelo: string } {
  const config = useRuntimeConfig()
  if (!config.openaiApiKey) throw new Error('OPENAI_API_KEY não configurada.')
  return { openai: new OpenAI({ apiKey: config.openaiApiKey as string }), modelo: (config.openaiModel as string) || 'gpt-4.1-mini' }
}

/** Prompt editável salvo na tela "Assistente IA" (agente "master"), ou o padrão. */
export async function carregarPrompt(admin: SupabaseClient): Promise<string> {
  const { data } = await admin.from('eva_system_prompt').select('content').eq('agent_name', 'master').maybeSingle()
  return data?.content?.trim() || PROMPT_PADRAO
}

/** Busca na base de conhecimento (RAG) os trechos mais próximos da pergunta. */
export async function buscarConhecimento(openai: OpenAI, admin: SupabaseClient, pergunta: string): Promise<string> {
  if (!pergunta.trim()) return ''
  try {
    const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: pergunta.slice(0, 2000) })
    const { data, error } = await admin.rpc('match_documents', { query_embedding: emb.data[0]?.embedding, match_count: 4, filter: {} })
    if (error) throw error
    return (data ?? [])
      .filter((d: { similarity: number }) => d.similarity > 0.3)
      .map((d: { content: string }) => d.content)
      .join('\n---\n')
  } catch (e) {
    console.error('[agente] Falha ao consultar a base de conhecimento:', e)
    return ''
  }
}

function descreverFicha(c: Partial<Contato> | null) {
  if (!c) return 'Contato novo, nada registrado ainda.'
  const campos: [string, unknown][] = [
    ['Nome', c.nome], ['Cidade', c.cidade], ['Área', c.area], ['Demanda', c.demanda],
    ['Parte contrária', c.parte_contraria], ['Resumo', c.resumo], ['Urgência', c.urgencia],
    ['O que a preocupa', c.dor], ['O que ela quer que mude', c.objetivo],
  ]
  const linhas = campos.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`)
  return linhas.length ? linhas.join('\n') : 'Contato novo, nada registrado ainda.'
}

/**
 * Gera a próxima resposta da assistente. Não tem efeitos colaterais: quem chama
 * decide se envia pelo WhatsApp e se grava a ficha (o simulador não grava).
 */
export async function gerarResposta(params: {
  openai: OpenAI
  modelo: string
  promptEditavel: string
  contato: Partial<Contato> | null
  historico: MensagemHistorico[]
  conhecimento: string
  escritorio?: Escritorio
}): Promise<RespostaAgente> {
  const sistema = [
    REGRAS_FIXAS,
    params.promptEditavel,
    blocoEscritorioParaAna(params.escritorio ?? {}),
    blocoMapaParaAna(params.escritorio ?? {}),
    params.conhecimento ? `# Base de conhecimento do escritório (use só se for relevante)\n${params.conhecimento}` : '',
    `# O que já sabemos deste contato\n${descreverFicha(params.contato)}`,
    `# Agora (horário de Brasília)\n${new Date().toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`,
    INSTRUCOES_SAIDA,
  ].filter(Boolean).join('\n\n')

  const mensagens = params.historico.slice(-24).map(m => ({
    role: m.autor === 'cliente' ? ('user' as const) : ('assistant' as const),
    content: m.autor === 'equipe' ? `[mensagem enviada pela equipe do escritório] ${m.conteudo}` : m.conteudo,
  }))

  const completion = await params.openai.chat.completions.create({
    model: params.modelo,
    temperature: 0.4,
    max_tokens: 900,
    messages: [{ role: 'system', content: sistema }, ...mensagens],
    response_format: { type: 'json_schema', json_schema: { name: 'resposta_assistente', strict: true, schema: SCHEMA as any } },
  })

  const bruto = completion.choices[0]?.message?.content ?? ''
  const r = JSON.parse(bruto) as RespostaAgente
  if (!r.resposta?.trim()) throw new Error('Resposta vazia do modelo.')
  r.resposta = r.resposta.trim().slice(0, 1500)
  return r
}

/** Converte a ficha extraída pela IA em atualização do contato, sem sobrescrever o que a equipe preencheu. */
export function mesclarFicha(atual: Partial<Contato>, ficha: FichaExtraida): Partial<Contato> {
  const upd: Record<string, unknown> = {}
  const preencherSeVazio = ['nome', 'cidade', 'email', 'area', 'demanda', 'parte_contraria'] as const
  for (const k of preencherSeVazio) {
    const v = ficha[k]?.trim()
    if (v && !atual[k]) upd[k] = v.slice(0, 200)
  }
  // Campos de leitura da conversa: a IA mantém atualizados.
  if (ficha.resumo?.trim()) upd.resumo = ficha.resumo.trim().slice(0, 1200)
  // Voz da cliente (alimenta o Mapa da Empatia com dados reais).
  if (ficha.dor?.trim()) upd.dor = ficha.dor.trim().slice(0, 300)
  if (ficha.objetivo?.trim()) upd.objetivo = ficha.objetivo.trim().slice(0, 300)
  if (ficha.urgencia) upd.urgencia = ficha.urgencia
  if (ficha.sentimento) upd.sentimento = ficha.sentimento
  const unir = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b.map(s => s.trim()).filter(Boolean)])].slice(0, 12)
  if (ficha.interesses?.length) upd.interesses = unir(atual.interesses, ficha.interesses)
  if (ficha.objecoes?.length) upd.objecoes = unir(atual.objecoes, ficha.objecoes)
  return upd as Partial<Contato>
}
