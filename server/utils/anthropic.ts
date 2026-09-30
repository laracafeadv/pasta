import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

/** Chamada mínima à API da Anthropic (Claude) que devolve um objeto JSON. Sem ANTHROPIC_API_KEY devolve null (o recurso cai no modo sem IA). */
export function iaDisponivel(event: H3Event): boolean { return !!String(useRuntimeConfig(event).anthropicApiKey || '') }

export async function perguntarJson(event: H3Event, prompt: string): Promise<Record<string, any>> {
  const c = useRuntimeConfig(event)
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': String(c.anthropicApiKey), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: String(c.anthropicModel || 'claude-sonnet-5-5'), max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
  })
  const j: any = await r.json().catch(() => ({}))
  if (!r.ok) throw createError({ statusCode: 502, message: 'A IA não respondeu agora.' })
  const texto: string = (j.content ?? []).map((b: any) => b.text ?? '').join('')
  const i = texto.indexOf('{'), f = texto.lastIndexOf('}')
  if (i < 0 || f <= i) throw createError({ statusCode: 502, message: 'Não consegui entender a resposta da IA.' })
  try { return JSON.parse(texto.slice(i, f + 1)) } catch { throw createError({ statusCode: 502, message: 'Não consegui entender a resposta da IA.' }) }
}
