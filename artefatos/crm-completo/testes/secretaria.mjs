// Secretária (etapa 2): Intimações e E-mail lidos do Gmail pelo conector (SIMULADO aqui com o formato real observado). A lógica do CRM é a real.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } })
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
const cnj = (seq, ano = 2026, jtr = '8.05', orig = '0001') => { const base = String(seq).padStart(7, '0') + String(ano) + jtr.replace('.', '') + orig; const dd = String(98n - ((BigInt(base + '00')) % 97n)).padStart(2, '0'); return `${String(seq).padStart(7, '0')}-${dd}.${ano}.${jtr}.${orig}` }
const C1 = cnj(1234567), C2 = cnj(7654321)
await p.addInitScript(([C1, C2]) => {
  window.__chamadas = []; window.__ticks = []
  const d = dia => new Date(`2026-10-${dia}T12:00:00-03:00`).toUTCString()
  const hoje = new Date(); const rec = new Date(hoje.getTime() - 3600e3).toUTCString()
  const corpo1 = `Processo ${C1}\n\nMovimentações\n| Data - Movimento |\n| 05/10/2026 09:00 - Expedição de intimação |\n| 02/10/2026 10:00 - Juntada de petição |\n`
  window.__INT = [
    { id: 'ti1', messages: [{ id: 'mi1', sender: 'PJe TJBA <noreply@tjba.jus.br>', subject: 'Intimação - processo ' + C1, date: d('06'), snippet: 'Processo ' + C1, labelIds: ['INBOX', 'UNREAD'], viewUrl: 'https://mail.google.com/mi1' }] },
    { id: 'ti2', messages: [{ id: 'mi2', sender: 'sso@cnj.jus.br', subject: 'Alerta de novo acesso à sua conta', date: d('07'), snippet: 'Detectamos um login de novo dispositivo. Sua senha', labelIds: ['INBOX'], viewUrl: 'https://mail.google.com/mi2' }] },
    { id: 'ti3', messages: [{ id: 'mi3', sender: 'TRT5 <push@trt5.jus.br>', subject: 'Movimentação processo ' + C2, date: d('08'), snippet: 'Juntada de petição ' + C2, labelIds: ['INBOX'], viewUrl: 'https://mail.google.com/mi3' }] },
  ]
  window.__BODY = { ti1: corpo1 + 'Despacho: intime-se para manifestação no prazo de 15 dias úteis. Disponibilizado em 05/10/2026.', ti3: `Processo ${C2}\n| Data - Movimento |\n| 08/10/2026 11:00 - Juntada de petição |\n` }
  const mk = (id, sender, subject, snippet, labels, n = 1, h = 1) => ({ id: 'e' + id, threads: 1, _t: { id: 'th' + id, messageCount: n, messages: [{ id: 'em' + id, sender, subject, snippet, labelIds: labels, date: new Date(Date.now() - h * 3600e3).toUTCString(), internalDate: String(Date.now() - h * 3600e3), viewUrl: 'https://mail.google.com/em' + id }] } })
  window.__EM = {
    'category:primary': [mk(1, 'Maria Souza <maria@x.com>', 'Documentos do inventário', 'Segue em anexo', ['INBOX', 'UNREAD', 'CATEGORY_PERSONAL'], 1, 2), mk(2, 'Banco <b@b.com>', 'Extrato', 'Seu extrato', ['INBOX'], 1, 5)],
    'is:unread': [mk(1, 'Maria Souza <maria@x.com>', 'Documentos do inventário', 'Segue em anexo', ['INBOX', 'UNREAD'], 1, 2)],
    'newer_than:3d': [mk(1, 'Maria Souza <maria@x.com>', 'Documentos do inventário', 'Segue em anexo', ['INBOX', 'UNREAD'], 1, 2), mk(2, 'Banco <b@b.com>', 'Extrato', 'Seu extrato', ['INBOX'], 1, 5), mk(3, 'Loja <l@l.com>', 'Oferta', 'Descontos', ['INBOX', 'CATEGORY_PROMOTIONS'], 1, 7)],
  }
  window.claude = { use: async n => n === 'mcp' ? { callTool: async (srv, tool, inp) => { window.__chamadas.push({ srv, tool, inp })
    if (srv === 'Gmail' && tool === 'search_threads') {
      if (/jus\.br/.test(inp.query)) return { payload: { threads: window.__INT } }
      const k = Object.keys(window.__EM).find(k => inp.query.includes(k)); return { payload: { threads: (window.__EM[k] || []).map(x => x._t) } } }
    if (srv === 'Gmail' && tool === 'get_thread') { const t = window.__INT.find(t => t.id === inp.threadId); return { payload: { id: t.id, messages: t.messages.map(m => ({ ...m, plaintextBody: window.__BODY[t.id] })) } } }
    if (srv === 'Google Calendar' && tool === 'create_event') return { payload: { id: 'gev1' } }
    return { payload: {} } } } : null }
}, [C1, C2])
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 200) => p.waitForTimeout(n)
const chamadas = (tool, f = () => true) => E(([tool, f]) => window.__chamadas.filter(c => c.tool === tool).map(c => c.inp), [tool])

/* Intimações */
await E(() => ir('secretaria')); await esp(300)
ok((await p.locator('main').innerText()).toLowerCase().includes('secretária'), 'módulo Secretária abre')
await E(() => ir('intimacoes')); await esp(300)
ok((await t('buscar-intimacoes').count()) > 0 || (await p.locator('main').innerText()).includes('Buscar'), 'aba Intimações tem botão de buscar')
await t('buscar-intimacoes').first().click(); await esp(1500)
const q = (await chamadas('search_threads'))[0]
ok(q && /from:jus\.br/.test(q.query) && /newer_than:14d/.test(q.query) && /-in:sent/.test(q.query), 'consulta: @jus.br, 14 dias, sem enviados — ' + (q && q.query))
const L = await E(() => DB.intimacoes.map(i => ({ ext: i.ext_id, cnj: i.numero_cnj, mov: i.movimento, trib: i.tribunal, nl: i.nao_lida_gmail, prazo: i.intimacao_prazo, link: i.link })))
ok(L.length === 2, 'importou 2 avisos e ignorou o alerta de login/senha — ' + L.map(x => x.ext))
const i1 = L.find(x => x.cnj === C1), i2 = L.find(x => x.cnj === C2)
ok(i1 && i1.mov === 'Expedição de intimação' && i1.trib === 'TJBA' && i1.nl === true && i1.link === 'https://mail.google.com/mi1', 'aviso 1: tribunal, movimentação mais recente, não lido e link do e-mail')
ok(i2 && i2.nl === false && i2.prazo === false, 'aviso 2 (TRT5, “Juntada de petição”): lido e fora de “intimações e prazos”')
const tx = await p.locator('main').innerText()
ok(tx.includes('comunica.pje.jus.br') || (await p.locator('a[href*="comunica.pje.jus.br"]').count()) > 0, 'link do DJEN presente')
ok(/n[ãa]o substitui/i.test(tx), 'aviso: o painel não substitui a consulta oficial')
ok((await t('ponto-nao-lida').count()) === 1, 'ponto de não lida só no aviso 1')
ok((await t('intimacao').count()) === 1, 'filtro padrão “Intimações e prazos” mostra só 1')
await t('intim-filtro-tudo').click(); await esp(150); ok((await t('intimacao').count()) === 2, '“Tudo” mostra os 2')
await t('intim-filtro-prazos').click(); await esp(150)
// Hoje / badge
ok((await E(() => contadores().intimacoes)) === 1, 'número da aba = intimações sem prazo lançado (1)')
const hoje = await E(() => itensHoje ? 1 : 1).catch(() => 1)
await E(() => ir('hoje')); await esp(300); ok((await p.locator('main').innerText()).includes('Intimação sem prazo lançado'), 'faixa Hoje mostra a intimação sem prazo lançado')
await E(() => ir('intimacoes')); await esp(200)
// Lançar prazo
await t('lancar-prazo').first().click(); await esp(200)
ok((await t('prazo-dias').inputValue()) === '15', 'modal: dias sugeridos do texto (15)')
const venc = await t('prazo-vence').innerText(); ok(/Vence em/.test(venc), 'mostra o vencimento antes de confirmar — ' + venc)
await t('prazo-modo').selectOption('corridos'); await esp(100)
const venc2 = await t('prazo-vence').innerText(); ok(venc2 !== venc, 'trocar para corridos recalcula')
await t('prazo-modo').selectOption('uteis'); await esp(100)
const antes = await E(() => DB.compromissos.length)
await t('prazo-confirmar').click(); await esp(800)
const ev = (await chamadas('create_event'))[0]
ok(ev && ev.allDay === true && ev.overrideReminders.map(r => r.minutes).join() === '3780,900', 'evento no Google Agenda dia inteiro com alertas 3 dias e 1 dia antes (minutes 3780, 900) — ' + JSON.stringify(ev && ev.overrideReminders))
ok((await E(() => DB.compromissos.length)) === antes + 1, 'compromisso criado na Agenda')
const st = await E(() => { const i = DB.intimacoes.find(x => x.numero_cnj === arguments[0]); return null }).catch(() => null)
const lanc = await E(([C1]) => { const i = DB.intimacoes.find(x => x.numero_cnj === C1); return { gc: i.prazo_lancado && i.prazo_lancado.gcal_id, et: etiquetaPrazo(i), semPrazo: DB.intimacoes.filter(semPrazoLancado).length } }, [C1])
ok(lanc.gc === 'gev1' && /^Prazo lançado · vence \d\d\/\d\d$/.test(lanc.et), 'marca “' + lanc.et + '”')
ok(lanc.semPrazo === 0 && (await E(() => contadores().intimacoes)) === 0, 'depois de lançar, sai da faixa Hoje e do número da aba')
ok((await p.locator('main').innerText()).includes('Prazo lançado · vence'), 'etiqueta aparece na lista')

/* E-mail */
await E(() => { UI.sec.aba = 'email'; ir('secretaria') }); await esp(1200)
ok((await t('email-linha').count()) === 2, 'Principal (7 dias): 2 e-mails')
let qs = (await chamadas('search_threads')).map(x => x.query)
ok(qs.some(x => /category:primary newer_than:7d/.test(x)), 'consulta da aba Principal usa category:primary e 7 dias')
ok((await t('email-nao-lido').count()) === 1, 'destaque de não lido em 1 e-mail')
ok((await t('email-abrir').first().getAttribute('href')) === 'https://mail.google.com/em1', 'link “Abrir” aponta para o Gmail')
const ln = await t('email-linha').first().innerText(); ok(ln.includes('Maria Souza') && ln.includes('Documentos do inventário') && ln.includes('Segue em anexo'), 'remetente, assunto e prévia')
await t('email-aba-naolidos').click(); await esp(1000)
ok((await t('email-linha').count()) === 1 && (await chamadas('search_threads')).some(x => /is:unread newer_than:14d/.test(x.query)), 'Não lidos (14 dias)')
await t('email-aba-tudo').click(); await esp(1000)
ok((await t('email-linha').count()) === 3 && (await chamadas('search_threads')).some(x => /newer_than:3d/.test(x.query)), 'Tudo (3 dias): 3 e-mails')
ok((await E(() => contadores().emailNaoLidos)) === 1, 'número da aba E-mail = não lidos')
// auto-atualização 5 min
const n0 = (await chamadas('search_threads')).length
ok((await E(() => EMAIL.intervalo)) === 300000, 'intervalo de atualização: 5 minutos')
await E(() => EMAIL.tick()); await esp(800)
ok((await chamadas('search_threads')).length > n0, 'o ciclo de atualização relê o Gmail')
await E(() => { UI.sec.aba = 'intimacoes'; render() }); const n1 = (await chamadas('search_threads')).length; await E(() => EMAIL.tick()); await esp(300)
ok((await chamadas('search_threads')).length === n1, 'fora da aba E-mail não lê')
ok(erros.length === 0, 'sem erros de console' + (erros.length ? ': ' + erros.slice(0, 3).join(' | ') : ''))
await b.close(); console.log(falhas ? falhas + ' FALHAS' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
