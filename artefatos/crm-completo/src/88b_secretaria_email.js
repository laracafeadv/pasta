'use strict'
/* ============ SECRETÁRIA: Intimações (88_intimacoes.js) e E-mail ============
   E-mail: lê o seu Gmail pelo conector (search_threads; get_thread quando a conversa tem mais mensagens do que a prévia traz).
   Abas: Principal (7 dias, categoria Principal) · Não lidos (14 dias) · Tudo (3 dias). Atualiza sozinho a cada 5 minutos ENQUANTO esta tela está aberta
   (o Artifact só roda com o CRM aberto: não há como receber e-mail novo com o CRM fechado). O CRM não marca como lido, não responde e não apaga: abrir é no Gmail. */
UI.sec = { aba: 'intimacoes', ...(UI.sec || {}) }
UI.email = { aba: 'principal', n: 20, ...(UI.email || {}) }
const EMAIL_ABAS = [['principal', 'Principal', 7, 'category:primary newer_than:7d -in:sent -in:draft'], ['naolidos', 'Não lidos', 14, 'is:unread newer_than:14d -in:sent -in:draft'], ['tudo', 'Tudo', 3, 'newer_than:3d -in:sent -in:draft']]
const EMAIL = { cache: {}, carregando: {}, erro: {}, timer: null, intervalo: 5 * 60 * 1000 }
const emailNaoLidos = () => { const c = EMAIL.cache.naolidos; return c ? c.itens.length : 0 }
const naViewEmail = () => R.rota === 'secretaria' && UI.sec.aba === 'email'
const redesenharEmail = () => { if (naViewEmail() || typeof render === 'function') render() }
const nomeDoRemetente = s => { const t = String(s || ''); const m = t.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>/); return m ? m[1].trim() : t.trim() || '(sem remetente)' }
const quandoEmail = iso => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; return diaDe(d.toISOString()) === hojeISO() ? horaCurta(d.toISOString()) : diaCurto(d.toISOString()) + ' ' + horaCurta(d.toISOString()) }
async function carregarEmails(aba, opc = {}) {
  const def = EMAIL_ABAS.find(x => x[0] === aba); if (!def || EMAIL.carregando[aba]) return
  EMAIL.carregando[aba] = true; EMAIL.erro[aba] = null; if (!opc.silencioso) redesenharEmail()
  try {
    const t = await gmail('search_threads', { query: def[3], pageSize: 50, view: 'THREAD_VIEW_MINIMAL' }); const threads = (t && t.threads) || []; const itens = []; let extra = 0
    for (const th of threads) {
      let msgs = th.messages || []; const total = Number(th.messageCount) || msgs.length
      if (total > msgs.length && extra < 8) { extra++; try { const x = await gmail('get_thread', { threadId: th.id, messageFormat: 'MINIMAL' }); if (x && x.messages && x.messages.length) msgs = x.messages } catch (e) { if (e && /not_granted|permission_denied|server_not_connected|indisponivel/.test(e.code || '')) throw e } }
      if (!msgs.length) continue
      const ts = m => Number(m.internalDate) || Date.parse(m.date) || 0; const m = msgs.slice().sort((a, b) => ts(b) - ts(a))[0]
      itens.push({ id: th.id, remetente: m.sender || '', assunto: m.subject || '(sem assunto)', previa: m.snippet || '', quando: m.date || null, ts: ts(m), naoLida: msgs.some(naoLidaNoGmail), n: total, link: m.viewUrl || m.view_url || th.viewUrl || th.view_url || null })
    }
    itens.sort((a, b) => b.ts - a.ts); EMAIL.cache[aba] = { itens, em: agora() }; CONFIG.integr.email_ok = true
  } catch (e) { EMAIL.erro[aba] = erroCopy(e) }
  finally { EMAIL.carregando[aba] = false; redesenharEmail() }
}
function iniciarAutoEmail() {
  if (EMAIL.timer) return
  EMAIL.tick = () => { if (document.hidden || !naViewEmail()) return; carregarEmails(UI.email.aba, { silencioso: true }) }
  EMAIL.timer = setInterval(EMAIL.tick, EMAIL.intervalo)
}
function ViewEmail() {
  const aba = EMAIL_ABAS.some(x => x[0] === UI.email.aba) ? UI.email.aba : 'principal'; const def = EMAIL_ABAS.find(x => x[0] === aba); const c = EMAIL.cache[aba]
  iniciarAutoEmail()
  if (!c && !EMAIL.carregando[aba] && !EMAIL.erro[aba]) setTimeout(() => carregarEmails(aba), 0)
  else if (c && Date.now() - new Date(c.em).getTime() > EMAIL.intervalo && !EMAIL.carregando[aba] && !EMAIL.erro[aba]) setTimeout(() => carregarEmails(aba, { silencioso: true }), 0)
  const itens = c ? c.itens : []; const vis = itens.slice(0, UI.email.n)
  const linha = m => h('div', { class: 'flex items-start gap-3 rounded-2xl border px-4 py-3 ' + (m.naoLida ? 'border-secondary/60 bg-secondary/5' : 'border-gray-200/70 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/50'), 'data-testid': 'email-linha' },
    h('span', { class: 'mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ' + (m.naoLida ? 'bg-secondary' : 'bg-transparent'), 'data-testid': m.naoLida ? 'email-nao-lido' : 'email-lido', title: m.naoLida ? 'Não lido' : '' }),
    h('div', { class: 'min-w-0 flex-1' }, h('div', { class: 'flex items-baseline justify-between gap-2' }, h('p', { class: 'text-sm truncate ' + (m.naoLida ? 'font-bold' : 'font-medium') }, nomeDoRemetente(m.remetente), m.n > 1 ? h('span', { class: 'ml-1 text-[11px] font-normal text-gray-400' }, `(${m.n})`) : null), h('span', { class: 'text-[11px] text-gray-500 shrink-0' }, quandoEmail(m.quando))), h('p', { class: 'text-sm truncate ' + (m.naoLida ? 'font-semibold' : '') }, m.assunto), h('p', { class: 'text-xs text-gray-500 line-clamp-2' }, m.previa)),
    m.link ? h('a', { href: m.link, target: '_blank', rel: 'noopener', class: 'btn-mini inline-flex items-center gap-1 border border-gray-300 dark:border-zinc-700 rounded-full px-3 py-1.5 text-xs shrink-0', 'data-testid': 'email-abrir' }, ic('ph:envelope-simple-open-bold'), 'Abrir') : null)
  return pagina('E-mail', 'O que chegou ao seu Gmail. O CRM só mostra: abrir, responder e arquivar é no Gmail.', [btn('Atualizar agora', { icone: 'ph:arrows-clockwise-bold', tid: 'email-atualizar', onclick: () => { EMAIL.erro[aba] = null; carregarEmails(aba) } })],
    h('div', { class: 'flex flex-wrap items-center gap-1.5' }, EMAIL_ABAS.map(([k, nome, dias]) => h('button', { type: 'button', class: 'filtro ' + (k === aba ? 'filtro-ativo' : ''), 'data-testid': 'email-aba-' + k, onclick: () => { UI.email.aba = k; UI.email.n = 20; render() } }, `${nome} (${dias} dias)` + (EMAIL.cache[k] ? ` · ${EMAIL.cache[k].itens.length}` : '')))),
    h('p', { class: 'text-[11px] text-gray-400', 'data-testid': 'email-atualizado' }, EMAIL.carregando[aba] ? 'Atualizando…' : c ? `Atualizado às ${horaCurta(c.em)} · atualiza sozinho a cada 5 minutos enquanto esta tela está aberta` : ''),
    EMAIL.erro[aba] ? alerta('erro', 'Não consegui ler o Gmail', EMAIL.erro[aba]) : null,
    vis.length ? h('div', { class: 'space-y-2', 'data-testid': 'email-lista' }, vis.map(linha)) : (c && !EMAIL.carregando[aba] ? estadoVazio('ph:tray-bold', 'Nenhum e-mail nesta aba', aba === 'naolidos' ? 'Nada não lido nos últimos 14 dias.' : 'Nada neste período.') : (!EMAIL.erro[aba] ? carregando('Lendo o Gmail…') : null)),
    itens.length > vis.length ? btn(`Ver mais (${itens.length - vis.length})`, { tipo: 'sec', tid: 'email-ver-mais', onclick: () => { UI.email.n += 20; render() } }) : null)
}
VIEWS.secretaria = (p) => {
  if (p && p.aba) UI.sec.aba = p.aba
  const n = contadores()
  return modulo({ titulo: 'Recebidos', sub: 'Intimações dos tribunais e e-mails do Gmail, lidos pelo conector com o CRM aberto.', abasDef: [{ id: 'intimacoes', nome: 'Intimações', icone: 'ph:megaphone-bold', n: n.intimacoes || null }, { id: 'email', nome: 'E-mail', icone: 'ph:envelope-simple-bold', n: n.emailNaoLidos || null }], ativa: UI.sec.aba, aoMudar: id => { UI.sec.aba = id; render() }, conteudo: a => a === 'email' ? ViewEmail() : VIEWS.intimacoes() })
}
