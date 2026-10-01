// Handlers das Edge Functions, independentes de runtime: recebem o cliente Supabase e o ambiente por parâmetro (testáveis em Node).
import { GRAPH_VERSAO, assinaturaValida, avanca, corpoDeEnvio, extrairEventos, mensagemDeErro, normalizarTelefone, statusCrm } from './whatsapp.ts'

export interface Amb { get(k: string): string | undefined }
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } })

async function diagnostico(db: any, info: Record<string, unknown>) {
  try { await db.from('escritorio').upsert({ chave: 'wa_ultimo_webhook', valor: JSON.stringify({ em: new Date().toISOString(), ...info }), updated_at: new Date().toISOString() }, { onConflict: 'chave' }) } catch { /* diagnóstico nunca derruba o webhook */ }
}

/** GET: verificação do webhook pela Meta. POST: mensagens, status de entrega e ecos (coexistência). */
export async function receberWebhook(req: Request, db: any, env: Amb): Promise<Response> {
  const url = new URL(req.url)
  if (req.method === 'GET') {
    const token = env.get('WHATSAPP_VERIFY_TOKEN')
    if (url.searchParams.get('hub.mode') === 'subscribe' && token && url.searchParams.get('hub.verify_token') === token) return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } })
    return json({ erro: 'Token de verificação inválido.' }, 403)
  }
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405)
  const bruto = await req.text()
  if (bruto.length > 1_000_000) return json({ erro: 'Corpo grande demais.' }, 413)
  if (!(await assinaturaValida(bruto, req.headers.get('x-hub-signature-256'), env.get('WHATSAPP_APP_SECRET')))) {
    await diagnostico(db, { ok: false, motivo: req.headers.get('x-hub-signature-256') ? 'assinatura não confere (App Secret diferente)' : 'sem assinatura' })
    return json({ erro: 'Assinatura inválida.' }, 401)
  }
  let payload: unknown
  try { payload = JSON.parse(bruto) } catch { return json({ erro: 'JSON inválido.' }, 400) }
  const ev = extrairEventos(payload)
  let gravadas = 0, duplicadas = 0, erros = 0
  for (const m of ev.mensagens) {
    try {
      const tel = normalizarTelefone(m.telefone)
      let { data: contato } = await db.from('contatos').select('id, nome').eq('telefone', tel).maybeSingle()
      if (!contato) {
        const { data: novo, error } = await db.from('contatos').insert({ telefone: tel, nome: m.nomePerfil?.slice(0, 120) || null, origem: 'WhatsApp', etapa: 'novo', proxima_acao: 'Responder no WhatsApp' }).select('id, nome').single()
        if (error && error.code === '23505') ({ data: contato } = await db.from('contatos').select('id, nome').eq('telefone', tel).single())
        else if (error) throw error
        else contato = novo
      }
      const { error } = await db.from('mensagens_whatsapp').insert({ contato_id: contato.id, direcao: 'entrada', autor: 'cliente', conteudo: m.texto, tipo: m.tipo, wa_message_id: m.waId, status: 'recebida', status_em: new Date(m.timestamp).toISOString(), metadata: m.midia ? { midia_pendente: true } : null })
      if (error) { if (error.code === '23505') { duplicadas++; continue } throw error }
      gravadas++
      await db.from('contatos').update({ ultima_mensagem_em: new Date().toISOString() }).eq('id', contato.id)
      const { data: equipe } = await db.from('profiles').select('id').in('role', ['admin', 'equipe'])
      if (equipe?.length) await db.from('notifications').insert(equipe.map((p: any) => ({ user_id: p.id, title: 'Nova mensagem no WhatsApp', message: `${contato.nome || tel}: ${m.texto.slice(0, 120)}`, metadata: { contato_id: contato.id, tipo: 'mensagem' } })))
    } catch (e) { erros++; console.error('[whatsapp-webhook] mensagem:', e) }
  }
  for (const s of ev.status) {
    try {
      const { data: atual } = await db.from('mensagens_whatsapp').select('id, status').eq('wa_message_id', s.waId).maybeSingle()
      const novo = statusCrm(s.status)
      if (atual && avanca(atual.status, novo)) await db.from('mensagens_whatsapp').update({ status: novo, status_em: new Date(s.timestamp).toISOString(), erro: s.erro }).eq('id', atual.id)
      if (s.status === 'failed') await db.from('whatsapp_saida').update({ status: 'falhou', erro: s.erro }).eq('wa_message_id', s.waId)
    } catch (e) { erros++; console.error('[whatsapp-webhook] status:', e) }
  }
  for (const eco of ev.ecos) { // o que você digita no app do celular (coexistência): só para quem já é contato
    try {
      const { data: contato } = await db.from('contatos').select('id').eq('telefone', normalizarTelefone(eco.telefone)).maybeSingle()
      if (!contato) continue
      const { error } = await db.from('mensagens_whatsapp').insert({ contato_id: contato.id, direcao: 'saida', autor: 'equipe', conteudo: eco.texto, tipo: 'texto', wa_message_id: eco.waId, status: 'enviada', status_em: new Date(eco.timestamp).toISOString(), metadata: { origem: 'app_celular' } })
      if (error && error.code !== '23505') throw error
    } catch (e) { erros++; console.error('[whatsapp-webhook] eco:', e) }
  }
  await diagnostico(db, { ok: true, mensagens: ev.mensagens.length, status: ev.status.length, ecos: ev.ecos.length, gravadas, duplicadas, erros })
  return json({ ok: true })
}

async function chamarMeta(env: Amb, f: typeof fetch, caminho: string, init?: RequestInit) {
  const token = env.get('WHATSAPP_TOKEN')
  if (!token) throw Object.assign(new Error('Falta o segredo WHATSAPP_TOKEN nas Edge Functions do Supabase.'), { codigo: 'config' })
  const r = await f(`https://graph.facebook.com/${env.get('WHATSAPP_GRAPH_VERSAO') || GRAPH_VERSAO}/${caminho}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const dados = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, dados }
}

async function sincronizarTemplates(db: any, env: Amb, f: typeof fetch) {
  const waba = env.get('WHATSAPP_WABA_ID'); if (!waba) throw Object.assign(new Error('Falta o segredo WHATSAPP_WABA_ID (ID da conta do WhatsApp Business).'), { codigo: 'config' })
  const r = await chamarMeta(env, f, `${waba}/message_templates?fields=name,language,status,category,components&limit=100`)
  if (!r.ok) throw new Error(mensagemDeErro(r.dados?.error?.code, r.dados?.error?.message))
  const lista = (r.dados.data ?? []).map((t: any) => ({ nome: t.name, idioma: t.language, categoria: t.category ?? null, status: t.status ?? null, componentes: t.components ?? null, sincronizado_em: new Date().toISOString() }))
  if (lista.length) await db.from('whatsapp_templates').upsert(lista, { onConflict: 'nome,idioma' })
  return lista.length
}

async function enviarUma(db: any, env: Amb, f: typeof fetch, id: number) {
  // Reserva atômica: só quem conseguir mudar pendente→enviando envia (nunca envia duas vezes).
  const { data: reservado } = await db.from('whatsapp_saida').update({ status: 'enviando' }).eq('id', id).eq('status', 'pendente').select('*')
  const s = reservado?.[0]; if (!s) return 'ignorada'
  try {
    if (s.tipo === 'sincronizar_templates') { const n = await sincronizarTemplates(db, env, f); await db.from('whatsapp_saida').update({ status: 'enviada', enviado_em: new Date().toISOString(), erro: null, texto: `${n} modelo(s) sincronizado(s)` }).eq('id', id); return 'ok' }
    const phone = env.get('WHATSAPP_PHONE_NUMBER_ID'); if (!phone) throw Object.assign(new Error('Falta o segredo WHATSAPP_PHONE_NUMBER_ID nas Edge Functions do Supabase.'), { codigo: 'config' })
    const corpo = corpoDeEnvio(s)
    const r = await chamarMeta(env, f, `${phone}/messages`, { method: 'POST', body: JSON.stringify(corpo) })
    if (!r.ok) throw Object.assign(new Error(mensagemDeErro(r.dados?.error?.code, r.dados?.error?.message)), { codigo: r.dados?.error?.code })
    const waId = r.dados?.messages?.[0]?.id ?? null
    await db.from('whatsapp_saida').update({ status: 'enviada', wa_message_id: waId, enviado_em: new Date().toISOString(), erro: null, tentativas: (s.tentativas ?? 0) + 1 }).eq('id', id)
    // Só agora (com a Meta tendo aceitado) a mensagem entra na conversa.
    await db.from('mensagens_whatsapp').insert({ contato_id: s.contato_id, caso_id: s.caso_id, direcao: 'saida', autor: 'equipe', conteudo: s.tipo === 'template' ? `[modelo: ${s.template_nome}]` : s.texto, tipo: s.tipo === 'template' ? 'template' : 'texto', template_nome: s.template_nome, wa_message_id: waId, status: 'enviada', status_em: new Date().toISOString() })
    return 'ok'
  } catch (e: any) {
    await db.from('whatsapp_saida').update({ status: 'falhou', erro: String(e?.message || e).slice(0, 400), tentativas: (s.tentativas ?? 0) + 1 }).eq('id', id)
    return 'falhou'
  }
}

/** POST {id} envia um item da fila; POST {varrer:true} reprocessa pendentes antigos e marca como incertos os que ficaram "enviando". */
export async function enviarSaida(req: Request, db: any, env: Amb, f: typeof fetch = fetch): Promise<Response> {
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405)
  const b = await req.json().catch(() => ({})) as { id?: number; varrer?: boolean }
  if (b.varrer) {
    const corte = new Date(Date.now() - 30_000).toISOString(); const preso = new Date(Date.now() - 120_000).toISOString()
    // "enviando" há mais de 2 min: não sabemos se a Meta recebeu. Não reenvia (evitaria duplicar): marca para conferência manual.
    await db.from('whatsapp_saida').update({ status: 'falhou', erro: 'Resultado incerto (a função parou no meio). Confira no celular antes de reenviar.' }).eq('status', 'enviando').lt('created_at', preso)
    const { data: pend } = await db.from('whatsapp_saida').select('id').eq('status', 'pendente').lt('created_at', corte).order('id').limit(20)
    const r: string[] = []; for (const p of pend ?? []) r.push(await enviarUma(db, env, f, p.id))
    return json({ ok: true, processadas: r.length })
  }
  const id = Number(b.id); if (!Number.isInteger(id) || id <= 0) return json({ erro: 'id inválido.' }, 400)
  return json({ ok: true, resultado: await enviarUma(db, env, f, id) })
}

/* ===================== FORMULÁRIO PÚBLICO ===================== */
import { ErroForm, validar } from './formulario.ts'
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
const rj = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } })
const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/
const INVALIDO = 'Este link não é mais válido. Peça um novo ao escritório.'

async function envioPorToken(db: any, token: string | null | undefined) {
  if (!token || !TOKEN_RE.test(token)) return null
  const { data: e } = await db.from('formulario_envios').select('id, contato_id, caso_id, status, expira_em, respondido_em, prazo_resposta, versao_formulario, estrutura, contato:contatos(nome)').eq('token', token).maybeSingle()
  if (!e || e.status === 'cancelado' || !e.estrutura) return null
  if (!e.respondido_em && new Date(e.expira_em).getTime() < Date.now()) return null
  return e
}

/** GET ?t=<token>: estrutura congelada do envio. POST {t, respostas, consentimento, respondente}: grava. POST ?acao=iniciar {t}: marca iniciado. */
export async function formularioPublico(req: Request, db: any): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const url = new URL(req.url)
  try {
    if (req.method === 'GET') {
      const e = await envioPorToken(db, url.searchParams.get('t')); if (!e) return rj({ erro: INVALIDO }, 404)
      if (!e.respondido_em && ['gerado', 'enviado'].includes(e.status)) await db.from('formulario_envios').update({ status: 'visualizado', visualizado_em: new Date().toISOString() }).eq('id', e.id).in('status', ['gerado', 'enviado'])
      const { data: esc } = await db.from('escritorio').select('chave, valor').in('chave', ['advogada_nome'])
      const adv = (esc ?? []).find((x: any) => x.chave === 'advogada_nome')?.valor
      const est = e.estrutura
      return rj({ primeiroNome: String(e.contato?.nome ?? '').trim().split(/\s+/)[0] || null, advogada: adv ? `Dra. ${adv}` : 'o escritório', respondido: !!e.respondido_em, prazo_resposta: e.prazo_resposta, expira_em: e.expira_em, formulario: { nome: est.nome, descricao: est.descricao ?? null, instrucoes: est.instrucoes ?? null, finalidade: est.finalidade ?? null, mensagem_final: est.mensagem_final ?? null }, secoes: est.secoes })
    }
    if (req.method !== 'POST') return rj({ erro: 'Método não permitido.' }, 405)
    const bruto = await req.text(); if (bruto.length > 1_000_000) return rj({ erro: 'Corpo grande demais.' }, 413)
    let b: any; try { b = JSON.parse(bruto) } catch { return rj({ erro: 'JSON inválido.' }, 400) }
    const e = await envioPorToken(db, b?.t); if (!e) return rj({ erro: INVALIDO }, 404)
    if (url.searchParams.get('acao') === 'iniciar') { await db.from('formulario_envios').update({ status: 'iniciado', iniciado_em: new Date().toISOString() }).eq('id', e.id).in('status', ['gerado', 'enviado', 'visualizado']); return rj({ ok: true }) }
    if (e.respondido_em) return rj({ erro: 'Este formulário já foi respondido. Se precisar corrigir algo, fale com o escritório.' }, 409)
    if (b.consentimento !== true) return rj({ erro: 'Para enviar, confirme que leu o aviso de privacidade.' }, 400)
    const linhas = validar(e.estrutura.secoes ?? [], b.respostas && typeof b.respostas === 'object' ? b.respostas : {})
    const agora = new Date().toISOString()
    // Resposta única: a atualização condicional garante que só uma requisição vence.
    const { data: reservado } = await db.from('formulario_envios').update({ status: 'respondido', respondido_em: agora, consentimento_em: agora, respondente: typeof b.respondente === 'string' ? b.respondente.trim().slice(0, 120) || null : null }).eq('id', e.id).is('respondido_em', null).neq('status', 'cancelado').select('id')
    if (!reservado?.length) return rj({ erro: 'Este formulário já foi respondido.' }, 409)
    if (linhas.length) {
      const { error } = await db.from('formulario_envio_respostas').insert(linhas.map(l => ({ ...l, envio_id: e.id, pergunta_versao: e.versao_formulario })))
      if (error) { await db.from('formulario_envios').update({ status: 'iniciado', respondido_em: null, consentimento_em: null, respondente: null }).eq('id', e.id); console.error('[formulario-publico] gravar:', error); return rj({ erro: 'Não foi possível salvar as respostas. Tente de novo.' }, 500) }
    }
    await db.from('atividades').insert({ contato_id: e.contato_id, caso_id: e.caso_id, tipo: 'Sistema', texto: `Formulário respondido: ${e.estrutura.nome}.` })
    const { data: equipe } = await db.from('profiles').select('id').in('role', ['admin', 'equipe'])
    if (equipe?.length) await db.from('notifications').insert(equipe.map((p: any) => ({ user_id: p.id, title: 'Formulário respondido', message: `${e.contato?.nome ?? 'Uma cliente'} respondeu “${e.estrutura.nome}”.`, metadata: { contato_id: e.contato_id, caso_id: e.caso_id, envio_id: e.id, tipo: 'formulario' } })))
    return rj({ ok: true, mensagem: e.estrutura.mensagem_final ?? null })
  } catch (err) {
    if (err instanceof ErroForm) return rj({ erro: err.message }, err.status)
    console.error('[formulario-publico]', err); return rj({ erro: 'Erro interno. Tente de novo em instantes.' }, 500)
  }
}
