import { serverSupabaseServiceRole } from '#supabase/server'
import { envioDoPreFormulario } from '../../../utils/formulario'
import { carregarEscritorio } from '../../../utils/escritorio'

/** Página pública do formulário pré-consulta: só o primeiro nome, o nome da advogada e a estrutura do formulário escolhido. */
export default defineEventHandler(async (event) => {
  const admin = serverSupabaseServiceRole(event)
  const envio = await envioDoPreFormulario(admin, getRouterParam(event, 'token'))
  const e = await carregarEscritorio(admin)

  if (envio.status === 'enviado') {
    await admin.from('formulario_envios').update({ status: 'visualizado', visualizado_em: new Date().toISOString() }).eq('id', envio.id)
  }

  return {
    primeiroNome: (envio.contato?.nome ?? '').trim().split(/\s+/)[0] || null,
    advogada: e.advogada_nome ? `Dra. ${e.advogada_nome}` : 'a advogada',
    respondido: !!envio.respondido_em,
    formulario: envio.estrutura ? { nome: envio.estrutura.nome, descricao: envio.estrutura.descricao } : null,
    secoes: envio.estrutura?.secoes ?? [],
  }
})
