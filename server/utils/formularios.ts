import type { SupabaseClient } from '@supabase/supabase-js'

export interface ItemEntrada { pergunta_id: number; obrigatoria?: boolean }

/** Normaliza a lista de itens vinda do corpo da requisição (pergunta_id + obrigatória, na ordem enviada). */
export function limparItens(body: any): ItemEntrada[] {
  if (!Array.isArray(body)) return []
  return body
    .map((i: any) => ({ pergunta_id: Number(i?.pergunta_id), obrigatoria: !!i?.obrigatoria }))
    .filter(i => Number.isInteger(i.pergunta_id) && i.pergunta_id > 0)
    .slice(0, 60)
}

/** Substitui os itens de um formulário pelos informados, na ordem da lista. */
export async function substituirItens(client: SupabaseClient, formularioId: number, itens: ItemEntrada[]) {
  const { error: delErro } = await client.from('formulario_itens').delete().eq('formulario_id', formularioId)
  if (delErro) throw createError({ statusCode: 500, message: 'Erro ao salvar as perguntas do formulário.' })
  if (!itens.length) return
  const linhas = itens.map((i, ordem) => ({ formulario_id: formularioId, pergunta_id: i.pergunta_id, ordem, obrigatoria: !!i.obrigatoria }))
  const { error: insErro } = await client.from('formulario_itens').insert(linhas)
  if (insErro) throw createError({ statusCode: 500, message: 'Erro ao salvar as perguntas do formulário.' })
}
