import { useRuntimeConfig } from '#imports'
import { adminDe, envioPorToken, secoesDoEnvio } from '../../../utils/formularioEnvios'
import { validarRespostasPublicas } from '../../../utils/formularioEstrutura'
import { notificarEquipe, registrarAtividade } from '../../../utils/crm'
import { enviarEmailEquipe } from '../../../utils/email'

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/**
 * Recebe as respostas. Valida contra a estrutura CONGELADA no envio (mesma lógica condicional da tela), grava a pergunta
 * como ela era (texto, tipo, opções, versão) e atualiza a ficha da pessoa (ou da demanda, se o formulário for de demanda).
 */
export default defineEventHandler(async (event) => {
  const admin = adminDe(event)
  const e = await envioPorToken(admin, getRouterParam(event, 'token'))
  const b = (await readBody<Record<string, unknown>>(event)) ?? {}
  if (b.consentimento !== true) throw createError({ statusCode: 400, message: 'Para enviar, confirme que leu o aviso de privacidade.' })
  const secoes = secoesDoEnvio(e)
  const brutas = b.respostas && typeof b.respostas === 'object' && !Array.isArray(b.respostas) ? (b.respostas as Record<string, unknown>) : {}
  const { linhas, validas } = validarRespostasPublicas(secoes, brutas)

  // Responder uma vez só: a atualização condicional impede duas respostas simultâneas para o mesmo link.
  const agora = new Date().toISOString()
  const { data: reservado } = await admin.from('formulario_envios')
    .update({ status: 'respondido', respondido_em: agora, consentimento_em: agora, respondente: txt(b.respondente, 120) })
    .eq('id', e.id).is('respondido_em', null).neq('status', 'cancelado').select('id')
  if (!reservado?.length) throw createError({ statusCode: 409, message: 'Este formulário já foi respondido.' })

  const opcoesDe = new Map(secoes.flatMap(s => s.itens).map(p => [p.pergunta_id, p.opcoes]))
  if (linhas.length) {
    const { error } = await admin.from('formulario_envio_respostas').insert(linhas.map(l => ({ ...l, envio_id: e.id, pergunta_opcoes: opcoesDe.get(l.pergunta_id) ?? [], pergunta_versao: e.versao_formulario })))
    if (error) {
      console.error('[formulario-publico] Erro ao gravar respostas:', error)
      await admin.from('formulario_envios').update({ status: 'iniciado', respondido_em: null, consentimento_em: null, respondente: null }).eq('id', e.id) // libera para tentar de novo
      throw createError({ statusCode: 500, message: 'Não foi possível salvar as respostas. Tente de novo.' })
    }
  }

  // Ficha atual: formulário de demanda grava na demanda do envio; os demais, na pessoa.
  if (validas.size) {
    const contexto = e.estrutura?.contexto
    if (contexto === 'demanda' && e.caso_id) {
      await admin.from('caso_respostas').upsert([...validas.entries()].map(([pergunta_id, resposta]) => ({ caso_id: e.caso_id, pergunta_id, resposta, updated_at: agora })), { onConflict: 'caso_id,pergunta_id' })
    } else {
      await admin.from('contato_respostas').upsert([...validas.entries()].map(([pergunta_id, resposta]) => ({ contato_id: e.contato_id, pergunta_id, resposta, updated_at: agora })), { onConflict: 'contato_id,pergunta_id' })
    }
  }
  const nome = e.contato?.nome ?? null
  const titulo = e.estrutura?.nome ?? 'Formulário'
  await admin.from('contatos').update({ consentimento_em: agora, ...(e.estrutura?.contexto === 'consulta' ? { pre_form_respondido_em: agora } : {}) }).eq('id', e.contato_id)
  await registrarAtividade(event, e.contato_id, 'Sistema', `Formulário respondido: ${titulo}.`, null, null, e.caso_id)
  await notificarEquipe(event, 'Formulário respondido', `${nome ?? 'Uma cliente'} respondeu “${titulo}”. Já dá para ver as respostas na ficha.`, { contato_id: e.contato_id, caso_id: e.caso_id, envio_id: e.id, tipo: 'formulario' })
  const siteUrl = String(useRuntimeConfig().public.siteUrl || '').replace(/\/+$/, '')
  await enviarEmailEquipe(event, `Formulário respondido — ${nome ?? 'cliente'}`, `<p><b>${esc(nome ?? 'Uma cliente')}</b> respondeu <b>${esc(titulo)}</b>.</p><p><a href="${siteUrl}/crm?abrir=${e.contato_id}">Abrir a ficha no CRM</a></p>`)
  return { ok: true, mensagem: e.estrutura?.mensagem_final ?? null }
})
