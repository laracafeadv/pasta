import { requireStaff } from '../../../utils/security'
import { iaDisponivel, perguntarJson } from '../../../utils/anthropic'
import { interpretarConversa } from '../../../utils/leadsSecretaria'
import { serverSupabaseClient } from '#supabase/server'

/** Lê a conversa exportada do WhatsApp (texto do .txt) e PROPÕE a ficha do lead. Não grava nada: a usuária confere e salva. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/lead-importar')
  const b = (await readBody<{ texto?: string; arquivo?: string }>(event)) ?? {}
  const conteudo = String(b.texto ?? '')
  if (!conteudo.trim()) throw createError({ statusCode: 400, message: 'O arquivo está vazio.' })
  if (conteudo.length > 3_000_000) throw createError({ statusCode: 413, message: 'Conversa grande demais. Exporte um período menor.' })
  const { data: p } = await (await serverSupabaseClient(event)).from('profiles').select('name, role').eq('id', userId).maybeSingle()
  const perfil = { trat: p?.role === 'admin' ? 'Dra.' : '', nome: p?.role === 'admin' ? 'Lara Café' : String(p?.name ?? '') }
  return interpretarConversa(iaDisponivel(event) ? (prompt: string) => perguntarJson(event, prompt) : null, conteudo, String(b.arquivo ?? ''), perfil)
})
