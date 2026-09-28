import type { SupabaseClient } from '@supabase/supabase-js'

export const FORM_VALIDADE_DIAS = 30
export const FORM_MAX_ARQUIVOS = 15
export const FORM_MAX_BYTES = 10 * 1024 * 1024
export const FORM_TIPOS: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' }

/** Valida o link do formulário. Não revela se o link existe ou expirou para quem não o tem. */
export async function contatoDoFormulario(admin: SupabaseClient, token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) throw createError({ statusCode: 404, message: 'Link inválido.' })
  const { data } = await admin.from('contatos')
    .select('id, nome, etapa, drive_pasta_id, form_expira, form_respondido_em, form_arquivos, origem')
    .eq('form_token', token).maybeSingle()
  if (!data || !data.form_expira || new Date(data.form_expira).getTime() < Date.now()) {
    throw createError({ statusCode: 404, message: 'Este link não é mais válido. Peça um novo ao escritório.' })
  }
  return data
}

export const PRE_FORM_VALIDADE_DIAS = 14

/** Valida o link de um envio do formulário pré-consulta e traz o contato + as perguntas do formulário escolhido, se houver. */
export async function envioDoPreFormulario(admin: SupabaseClient, token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) throw createError({ statusCode: 404, message: 'Link inválido.' })
  const { data: envio } = await admin.from('formulario_envios')
    .select('id, contato_id, formulario_id, expira_em, respondido_em, status, contato:contatos(id, nome, resumo)')
    .eq('token', token).maybeSingle()
  if (!envio || new Date(envio.expira_em).getTime() < Date.now()) {
    throw createError({ statusCode: 404, message: 'Este link não é mais válido. Peça um novo ao escritório.' })
  }
  let itens: { pergunta_id: number; obrigatoria: boolean; pergunta: { texto: string; tipo: string; opcoes: string[] } }[] = []
  if (envio.formulario_id) {
    const { data } = await admin.from('formulario_itens')
      .select('pergunta_id, obrigatoria, ordem, pergunta:formulario_perguntas(texto, tipo, opcoes)')
      .eq('formulario_id', envio.formulario_id).order('ordem')
    itens = (data ?? []) as any
  }
  return { ...envio, itens }
}
