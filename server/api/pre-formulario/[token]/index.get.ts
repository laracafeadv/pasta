import { serverSupabaseServiceRole } from '#supabase/server'
import { contatoDoPreFormulario } from '../../../utils/formulario'
import { carregarEscritorio } from '../../../utils/escritorio'

/** Página pública do formulário pré-consulta: só o primeiro nome e o nome da advogada. */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const c = await contatoDoPreFormulario(admin, getRouterParam(event, 'token'))
  const e = await carregarEscritorio(admin)
  return {
    primeiroNome: (c.nome ?? '').trim().split(/\s+/)[0] || null,
    advogada: e.advogada_nome ? `Dra. ${e.advogada_nome}` : 'a advogada',
    respondido: !!c.pre_form_respondido_em,
    perguntasExtra: c.pre_form_perguntas_extra ?? [],
  }
})
