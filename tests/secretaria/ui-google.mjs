// Teste das abas Intimações e E-mail no navegador (Playwright), APIs simuladas.
// Uso: página temporária app/pages/__t_secretaria.vue (cópia de secretaria.vue sem middleware) + servidor .output em :3100.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const agora = new Date()
const iso = h => new Date(agora.getTime() - h * 3600e3).toISOString()
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(agora)
const aviso = (id, tribunal, chave, cnj, mov, h, naoLida, intimacao = true) => ({ id, tribunal, chave, cnj, movimentacao: mov, dataMov: '', dataEmail: iso(h).slice(0, 10), intimacao, quando: iso(h), link: 'https://mail.google.com/mail/#all/' + id, naoLida })
const itens = [
  aviso('t1', 'TJBA', 'tjba', '0000123-45.2025.8.05.0001', 'Expedição de intimação para manifestação em 15 dias', 2, true),
  aviso('t4', 'Justiça Federal', 'jf', '0000777-22.2025.4.01.3300', 'Intimação eletrônica', 50, false),
  aviso('t3', 'TJBA', 'tjba', '0000999-11.2024.8.05.0002', 'Juntada de petição', 30, false, false),
]
for (let i = 0; i < 14; i++) itens.push(aviso('x' + i, 'TJBA', 'tjba', `00001${10 + i}-00.2025.8.05.0001`, 'Intimação para ciência ' + i, 60 + i, false))
const mail = { principal: [{ id: 'p1', de: 'cliente@exemplo.com', assunto: 'Documentos do processo', previa: 'Segue em anexo...', quando: iso(1), naoLida: true, link: 'https://mail.google.com/mail/#all/p1' }, { id: 'p2', de: 'amiga@exemplo.com', assunto: 'Reunião', previa: 'Combinado', quando: iso(30), naoLida: false, link: 'https://mail.google.com/mail/#all/p2' }], naolidos: [{ id: 'n1', de: 'fornecedor@exemplo.com', assunto: 'Orçamento', previa: 'Olá', quando: iso(10), naoLida: true, link: 'l' }], tudo: [{ id: 'a1', de: 'alguem@exemplo.com', assunto: 'Oi', previa: 'Tudo bem?', quando: iso(0.2), naoLida: false, link: 'l' }] }
const estado = { configurado: false, conectado: false, lancados: {}, chamadas: [], body: null, erroPrazo: null }
const inicio = () => ({ hoje, config: { tribunal: 'tjba', pontos_facultativos: false, cidade: 'Salvador', atalhos: [] }, lembretes: [], suspensoes: [], eventos: [] })
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
async function abrir(vp, esquema, url = '/__t_secretaria') {
  const ctx = await b.newContext({ viewport: vp, colorScheme: esquema, timezoneId: 'America/Bahia' }); const p = await ctx.newPage(); const erros = []
  p.on('pageerror', e => { if (!/Unexpected token '<'/.test(String(e))) erros.push(String(e)) }); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_|favicon/.test(m.text())) erros.push(m.text()) })
  await p.route('**/api/**', async r => {
    const u = new URL(r.request().url()), m = r.request().method(), body = r.request().postData() ? JSON.parse(r.request().postData()) : null
    const json = (d, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) })
    estado.chamadas.push(m + ' ' + u.pathname + u.search)
    if (u.pathname === '/api/me') return json({ id: 'u1', name: 'Lara Café', role: 'admin', avatar_url: null })
    if (u.pathname === '/api/google/status') return json({ configurado: estado.configurado, conectado: estado.conectado, email: estado.conectado ? 'lara@gmail.com' : null, redirectUri: 'https://crm.exemplo.com/api/google/callback' })
    if (u.pathname === '/api/secretaria/inicio') return json(inicio())
    if (u.pathname === '/api/secretaria/intimacoes' && m === 'GET') return json({ conectado: true, configurado: true, itens, lancados: estado.lancados })
    if (u.pathname === '/api/secretaria/email') return json(mail[u.searchParams.get('sub')] ?? [])
    if (/\/api\/secretaria\/intimacoes\/[^/]+\/prazo$/.test(u.pathname)) { estado.body = body; if (estado.erroPrazo) return json({ statusCode: 403, message: estado.erroPrazo }, 403); estado.lancados[u.pathname.split('/')[4]] = { prazo: '2026-10-22', evento_link: 'https://cal/x' }; return json({ vence: '2026-10-22', evento_link: 'https://cal/x', item_id: 5 }) }
    return json({}, 404)
  })
  await p.clock.install({ time: agora })
  await p.goto('http://localhost:3100' + url); await p.clock.runFor(1500); await p.waitForTimeout(700)
  return { p, ctx, erros }
}

// 1) servidor sem credenciais do Google: passo a passo
let { p, ctx, erros } = await abrir({ width: 1200, height: 900 }, 'light')
await p.click('.tabs button:has-text("Intimações")'); await p.waitForSelector('[data-testid=google-conectar]')
let t = await p.locator('[data-testid=google-conectar]').innerText()
ok(/GOOGLE_CLIENT_ID/.test(t) && /GOOGLE_CLIENT_SECRET/.test(t) && /crm\.exemplo\.com\/api\/google\/callback/.test(t) && await p.locator('[data-testid=botao-conectar]').count() === 0, 'sem credenciais: mostra o passo a passo e o endereço de retorno, sem botão')
ok(erros.length === 0, 'sem erros de console (passo a passo) ' + erros.join('|'))
await ctx.close()

// 2) configurado, conta ainda não conectada
estado.configurado = true
;({ p, ctx, erros } = await abrir({ width: 1200, height: 900 }, 'light'))
await p.click('.tabs button:has-text("E-mail")'); await p.waitForSelector('[data-testid=google-conectar]')
ok(await p.locator('[data-testid=botao-conectar]').getAttribute('href') === '/api/google/conectar' && /ler\*? o Gmail|ler<\/b> o Gmail|nunca envia/.test(await p.locator('[data-testid=google-conectar]').innerText()), 'configurado e não conectado: botão "Conectar com o Google" e promessa de só leitura')
await ctx.close()
;({ p, ctx } = await abrir({ width: 1200, height: 900 }, 'light', '/__t_secretaria?google=negado'))
ok(/não autorizou/.test(await p.locator('[data-testid=aviso-google]').innerText()), 'volta do Google negada: mensagem clara')
await ctx.close()

// 3) conectado
estado.conectado = true
for (const [nome, vp, esquema] of [['desk', { width: 1200, height: 900 }, 'light'], ['mobile-dark', { width: 390, height: 800 }, 'dark']]) {
  estado.lancados = {}; estado.body = null; estado.erroPrazo = null
  ;({ p, ctx, erros } = await abrir(vp, esquema))
  ok(erros.length === 0, nome + ' sem erros de console ' + erros.join('|').slice(0, 200))
  ok((await p.locator('.tabs .selo').allInnerTexts()).includes('16'), nome + ' selo da aba Intimações = 16 sem prazo lançado')
  ok((await p.locator('[data-testid=tile-intim] .n').innerText()) === '16', nome + ' faixa HOJE: cartão "Intimações sem prazo lançado" = 16')
  await p.click('.tabs button:has-text("Intimações")'); await p.waitForSelector('[data-testid=intim-t1]')
  const t1 = await p.locator('[data-testid=intim-t1]').innerText()
  ok(/TJBA/.test(t1) && /0000123-45\.2025\.8\.05\.0001/.test(t1) && /Expedição de intimação/.test(t1) && /abrir e-mail/.test(t1), nome + ' aviso: tribunal, CNJ, movimentação, link')
  ok(await p.locator('[data-testid=intim-t1] .bolinha.on').count() === 1 && await p.locator('[data-testid=intim-t4] .bolinha.on').count() === 0, nome + ' bolinha só na não lida')
  ok(await p.locator('[data-testid=intim-t3]').count() === 0 && await p.locator('.intim').count() === 10 && /Ver mais \(6\)/.test(await p.locator('#sIntim').innerText()), nome + ' filtro "Intimações e prazos" + "Ver mais"')
  await p.click('#sIntim .chip:has-text("Tudo")'); ok(await p.locator('[data-testid=intim-t3]').count() === 1, nome + ' filtro Tudo'); await p.click('#sIntim .chip:has-text("Intimações e prazos")')
  ok(await p.locator('a[href="https://comunica.pje.jus.br"]').count() === 1 && /não substitui a consulta oficial/.test(await p.locator('#sIntim').innerText()), nome + ' DJEN e aviso')
  if (nome === 'desk') {
    await p.click('[data-testid=lancar-t1]'); await p.waitForSelector('[data-testid=form-prazo]')
    const u1 = await p.locator('[data-testid=form-venc]').innerText()
    await p.selectOption('#fModo', 'corridos'); await p.waitForTimeout(100)
    const u2 = await p.locator('[data-testid=form-venc]').innerText()
    ok(u1 !== u2 && /\d{2}\/\d{2}\/\d{4}/.test(u2), `vencimento aparece antes de confirmar e muda com úteis × corridos (${u1} × ${u2})`)
    await p.selectOption('#fModo', 'uteis'); await p.fill('#fDias', '10'); await p.waitForTimeout(100)
    ok(!estado.chamadas.some(c => /POST .*\/prazo/.test(c)), 'nada é enviado antes de confirmar')
    estado.erroPrazo = 'Faltou uma permissão do Google (Gmail ou Agenda). Conecte de novo e marque todas.'
    await p.click('[data-testid=form-confirmar]'); await p.waitForTimeout(500)
    ok(/Faltou uma permissão/.test(await p.locator('[data-testid=form-prazo]').innerText()) && await p.locator('[data-testid=lancado-t1]').count() === 0, 'erro do Google aparece no formulário e o aviso NÃO é marcado')
    estado.erroPrazo = null
    await p.click('[data-testid=form-confirmar]'); await p.waitForTimeout(800)
    ok(estado.body.dias === 10 && estado.body.modo === 'uteis' && estado.body.tribunal === 'tjba' && /^\d{4}-\d{2}-\d{2}$/.test(estado.body.ciencia) && !('vencimento' in estado.body), 'envia dias, contagem, ciência e calendário (o servidor calcula o vencimento)')
    ok(/^Prazo lançado · vence 22\/10$/.test((await p.locator('[data-testid=lancado-t1]').innerText()).trim()), 'aviso marcado: "Prazo lançado · vence dd/mm"')
    ok((await p.locator('.tabs .selo').allInnerTexts()).includes('15'), 'selo da aba desce para 15')
    // e-mail
    await p.click('.tabs button:has-text("E-mail")'); await p.waitForSelector('[data-testid=mail-p1]')
    const m1 = await p.locator('[data-testid=mail-p1]').innerText()
    ok(await p.locator('[data-testid=mail-p1].nova').count() === 1 && await p.locator('[data-testid=mail-p2].nova').count() === 0 && /cliente@exemplo\.com/.test(m1) && /Documentos do processo/.test(m1) && /Segue em anexo/.test(m1) && await p.locator('[data-testid=mail-p1]').getAttribute('href') === 'https://mail.google.com/mail/#all/p1', 'E-mail: remetente, assunto, prévia, destaque no não lido e link')
    await p.click('[data-testid=sub-naolidos]'); await p.waitForSelector('[data-testid=mail-n1]'); await p.click('[data-testid=sub-tudo]'); await p.waitForSelector('[data-testid=mail-a1]')
    ok(['principal', 'naolidos', 'tudo'].every(s => estado.chamadas.some(c => c.includes('/api/secretaria/email?sub=' + s))), 'três abas: Principal, Não lidos, Tudo')
    const n0 = estado.chamadas.filter(c => /api\/secretaria\/(intimacoes|email)/.test(c) && c.startsWith('GET')).length
    await p.clock.runFor(5 * 60 * 1000 + 1000); await p.waitForTimeout(900)
    const n1 = estado.chamadas.filter(c => /api\/secretaria\/(intimacoes|email)/.test(c) && c.startsWith('GET')).length
    ok(n1 >= n0 + 2, `atualização automática a cada 5 minutos (leituras ${n0} → ${n1})`)
  }
  await p.screenshot({ path: `${process.env.SHOTS || '/tmp'}/cg-${nome}.png`, fullPage: true }); await ctx.close()
}
await b.close(); console.log(falhas ? falhas + ' FALHA(S)' : 'OK'); process.exit(falhas ? 1 : 0)
