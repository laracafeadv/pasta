import { serverSupabaseServiceRole } from '#supabase/server'
import { contatoDoFormulario } from '../../../utils/formulario'
import { carregarEscritorio } from '../../../utils/escritorio'

/** Página pública do formulário: só o primeiro nome e o nome da advogada (nada de dados guardados). */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const c = await contatoDoFormulario(admin, getRouterParam(event, 'token'))
  const e = await carregarEscritorio(admin)
  return {
    primeiroNome: (c.nome ?? '').trim().split(/\s+/)[0] || null,
    advogada: e.advogada_nome ? `Dra. ${e.advogada_nome}` : 'o escritório',
    respondido: !!c.form_respondido_em,
    arquivos: c.form_arquivos,
  }
})
