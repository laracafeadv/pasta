import { serverSupabaseClient } from '#supabase/server'
import { requireStaff } from '../../utils/security'
import { lerConfig, limparAtalhos } from '../../utils/secretaria'

/** Preferências da usuária: tribunal padrão, pontos facultativos, cidade e atalhos. Só os campos enviados mudam. */
export default defineEventHandler(async (event) => {
  const { userId } = await requireStaff(event, 'secretaria/config')
  const b = (await readBody<Record<string, any>>(event)) ?? {}
  const client = await serverSupabaseClient(event)
  const atual = await lerConfig(client)
  const novo = {
    user_id: userId,
    tribunal: ['tjba', 'trt5', 'jf', 'nac'].includes(b.tribunal) ? b.tribunal : atual.tribunal,
    pontos_facultativos: typeof b.pontos_facultativos === 'boolean' ? b.pontos_facultativos : atual.pontos_facultativos,
    cidade: typeof b.cidade === 'string' && b.cidade.trim() ? b.cidade.trim().slice(0, 80) : atual.cidade,
    atalhos: b.atalhos !== undefined ? limparAtalhos(b.atalhos) : atual.atalhos,
  }
  const { error } = await client.from('secretaria_config').upsert(novo, { onConflict: 'user_id' })
  if (error) { console.error('[secretaria/config]', error); throw createError({ statusCode: 500, message: 'Não foi possível salvar.' }) }
  return { success: true }
})
