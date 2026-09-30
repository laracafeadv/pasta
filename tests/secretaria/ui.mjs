// Teste da tela da Secretária no navegador (Playwright) com as APIs simuladas.
// Uso: página temporária app/pages/__t_secretaria.vue (cópia de secretaria.vue sem middleware) + servidor .output em :3100.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const hoje = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date())
const add = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
const amanha = add(hoje, 1)
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const estado = {
  lembretes: [{ id: 1, texto: 'Ligar ao cartório', data: add(hoje, -2), hora: null, feito: false, feito_em: null, compromisso_id: null }],
  suspensoes: [], atalhos: [{ id: 'inss', nome: 'Meu INSS', url: 'https://meu.inss.gov.br' }, { id: 'tj', nome: 'eproc / PJe do TJ', url: '' }],
  tribunal: 'tjba', fac: false, chamadas: [],
}
const itens = [
  { id: 1, tipo: 'prazo', titulo: 'Réplica — Fulano', dia: hoje, hora: null, cliente: 'Fulano', local: null, obs: null, meu: true },
  { id: 2, tipo: 'audiencia', titulo: 'Audiência de instrução', dia: hoje, hora: '14:00', cliente: 'Beltrana', local: 'Fórum', obs: null, meu: false },
  { id: 3, tipo: 'prazo', titulo: 'Contestação', dia: amanha, hora: null, cliente: null, local: null, obs: null, meu: true },
  { id: 4, tipo: 'tarefa', titulo: 'Protocolar petição', dia: amanha, hora: null, cliente: null, local: null, obs: null, meu: true },
  { id: 7, tipo: 'prazo', titulo: 'Apelação vencida', dia: add(hoje, -1), hora: null, cliente: null, local: null, obs: null, meu: true },
]
for (let i = 0; i < 20; i++) itens.push({ id: 100 + i, tipo: 'compromisso', titulo: 'Compromisso ' + i, dia: add(hoje, 3), hora: '0' + (i % 9) + ':00', cliente: null, local: null, obs: null, meu: true })
const eventos = () => itens.filter(i => !i.feito).sort((a, b) => a.dia.localeCompare(b.dia) || (a.hora ?? '').localeCompare(b.hora ?? ''))
const inicio = () => ({ hoje, config: { tribunal: estado.tribunal, pontos_facultativos: estado.fac, cidade: 'Salvador', atalhos: estado.atalhos }, lembretes: estado.lembretes, suspensoes: estado.suspensoes, eventos: eventos() })
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
for (const [nome, vp, esquema] of [['desk', { width: 1200, height: 900 }, 'light'], ['mobile-dark', { width: 390, height: 800 }, 'dark']]) {
  itens.forEach(i => { i.feito = false }); itens.length = 25; estado.lembretes = [{ id: 1, texto: 'Ligar ao cartório', data: add(hoje, -2), hora: null, feito: false, feito_em: null, compromisso_id: null }]; estado.tribunal = 'tjba'; estado.suspensoes = []
  const ctx = await b.newContext({ viewport: vp, colorScheme: esquema, timezoneId: 'America/Bahia' }); const p = await ctx.newPage(); const erros = []
  // o script de métricas da Vercel (/_vercel/speed-insights) não existe no servidor local e devolve HTML: ignorado
  p.on('pageerror', e => { if (!/Unexpected token '<'/.test(String(e))) erros.push(String(e)) }); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_|favicon/.test(m.text())) erros.push(m.text()) })
  await p.route('**/api/**', async r => {
    const u = new URL(r.request().url()), m = r.request().method(), body = r.request().postData() ? JSON.parse(r.request().postData()) : null
    const json = (d, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) })
    estado.chamadas.push(m + ' ' + u.pathname)
    if (u.pathname === '/api/me') return json({ id: 'u1', name: 'Lara Café', role: 'admin', avatar_url: null })
    if (/\/api\/secretaria\/itens\/\d+$/.test(u.pathname)) { const it = itens.find(x => x.id === Number(u.pathname.split('/').pop())); if (m === 'PATCH') it.feito = body.feito; else itens.splice(itens.indexOf(it), 1); return json({ success: true }) }
    if (u.pathname === '/api/secretaria/inicio') return json(inicio())
    if (u.pathname === '/api/secretaria/criar') { estado.ultimoCriar = body; if (body.tipo === 'lembrete') estado.lembretes.push({ id: 9, texto: body.titulo, data: body.data, hora: body.hora, feito: false, compromisso_id: null }); return json({ tipo: body.tipo, id: 50, vencimento: body.tipo === 'prazo' ? '2026-10-22' : undefined }) }
    if (u.pathname === '/api/secretaria/config') { if (body.tribunal) estado.tribunal = body.tribunal; if ('pontos_facultativos' in body) estado.fac = body.pontos_facultativos; if (body.atalhos) estado.atalhos = body.atalhos; return json({ success: true }) }
    if (u.pathname === '/api/secretaria/lembretes' && m === 'POST') { estado.lembretes.push({ id: 10, texto: body.texto, data: body.data, hora: body.hora, feito: false, compromisso_id: null }); return json({ id: 10 }) }
    if (/\/api\/secretaria\/lembretes\/\d+$/.test(u.pathname) && m === 'PATCH') { const l = estado.lembretes.find(x => x.id === Number(u.pathname.split('/').pop())); l.feito = body.feito; return json({ success: true }) }
    if (u.pathname === '/api/secretaria/suspensoes') { estado.suspensoes.push({ id: 1, de: body.de, ate: body.ate || body.de, tribunal: body.tribunal, motivo: body.motivo }); return json({ id: 1 }) }
    return json({}, 404)
  })
  await p.goto('http://localhost:3100/__t_secretaria'); await p.waitForSelector('[data-testid=tile-prazos-hoje]', { timeout: 15000 }); await p.waitForTimeout(400)
  ok(erros.length === 0, nome + ' sem erros de console ' + erros.join(' | ').slice(0, 300))
  const txt = await p.locator('body').innerText()
  ok(/Bom dia|Boa tarde|Boa noite/.test(txt) && /Dra\. Lara/.test(txt), nome + ' saudação "Dra. Lara"')
  ok((await p.locator('[data-testid=tile-prazos-hoje] .n').innerText()) === '1' && (await p.locator('[data-testid=tile-prazos-amanha] .n').innerText()) === '1' && (await p.locator('[data-testid=tile-atrasados] .n').innerText()) === '1' && (await p.locator('[data-testid=tile-hoje] .n').innerText()) === '1', nome + ' faixa HOJE: 1 prazo hoje, 1 amanhã, 1 atrasado, 1 compromisso com horário')
  const selos = await p.locator('.tabs .selo').allInnerTexts()
  ok(selos.join(',') === '4', nome + ' selo dourado só no Início = 4 (vencido + hoje + amanhã + lembrete atrasado) → ' + selos.join(','))
  ok(/1 prazo\(s\) vencido\(s\) sem baixa/.test(await p.locator('[data-testid=tile-prazos-hoje]').innerText()) && await p.locator('.ev.vencido').count() === 1, nome + ' prazo vencido sem baixa aparece no cartão e na agenda')
  ok(await p.locator('.ev.audiencia').count() === 1 && await p.locator('.ev.prazo').count() === 3, nome + ' agenda com cores por tipo')
  ok(/Ver mais/.test(txt), nome + ' "ver mais" na agenda longa')
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), nome + ' sem rolagem horizontal')
  if (nome === 'desk') {
    await p.selectOption('select[aria-label="Quais agendas"]', 'minhas'); await p.waitForTimeout(150)
    ok(await p.locator('.ev.audiencia').count() === 0, 'filtro "Só as minhas" esconde a audiência de outra responsável')
    await p.selectOption('select[aria-label="Quais agendas"]', 'todo')
    await p.click('.chip:has-text("Prazo fatal")'); await p.waitForTimeout(100); ok(await p.locator('.ev.prazo').count() === 0, 'filtro por tipo esconde prazos')
    await p.click('.chip:has-text("Prazo fatal")')
    // concluir e excluir item da agenda própria
    await p.click('[data-testid=item-7] [data-testid=concluir-item]'); await p.waitForTimeout(300)
    ok(itens.find(i => i.id === 7).feito === true && await p.locator('[data-testid=item-7]').count() === 0, 'concluir prazo vencido tira da agenda')
    // campo natural: prazo
    await p.fill('#nlTxt', 'prazo de 15 dias para réplica, intimada hoje'); await p.click('[data-testid=interpretar]'); await p.waitForSelector('[data-testid=proposta]')
    ok(/Vence em/.test(await p.locator('[data-testid=proposta]').innerText()), 'campo natural: proposta de prazo com vencimento calculado')
    await p.click('[data-testid=confirmar]'); await p.waitForTimeout(400)
    ok(estado.ultimoCriar.tipo === 'prazo' && estado.ultimoCriar.dias === 15 && estado.ultimoCriar.titulo === 'Réplica' && estado.ultimoCriar.inicio === hoje, 'POST /api/secretaria/criar com tipo, dias, título e início (sem vencimento: o servidor calcula)')
    ok(/Prazo criado na agenda da Secretária/.test(await p.locator('body').innerText()), 'mensagem de prazo criado')
    // lembrete por texto
    await p.fill('#nlTxt', 'me lembra amanhã às 10h de ligar para o cliente'); await p.click('[data-testid=interpretar]'); await p.waitForSelector('[data-testid=proposta]'); await p.click('[data-testid=confirmar]'); await p.waitForTimeout(400)
    ok(estado.ultimoCriar.tipo === 'lembrete' && estado.ultimoCriar.data === amanha && estado.ultimoCriar.hora === '10:00' && /Ligar para o cliente/.test(estado.ultimoCriar.titulo) && /Ligar para o cliente/.test(await p.locator('#sLembretes').innerText()), 'lembrete por texto: amanhã 10:00, aparece nos lembretes')
    // resumo
    await p.click('[data-testid=resumo]'); ok(/Réplica/.test(await p.locator('[data-testid=resumo-texto]').innerText()) && /Ligar ao cartório/.test(await p.locator('[data-testid=resumo-texto]').innerText()), 'Resumo do dia cita prazo de hoje e lembrete atrasado')
    // concluir lembrete
    await p.locator('[data-testid=lembrete-1] input[type=checkbox]').check(); await p.waitForTimeout(300)
    ok(estado.lembretes.find(l => l.id === 1).feito === true, 'concluir lembrete')
    // calculadora
    await p.fill('#cInicio', '2026-12-18'); await p.fill('#cDias', '5'); await p.waitForTimeout(150)
    ok(/27\/01\/2027/.test(await p.locator('[data-testid=vencimento]').innerText()), 'calculadora: recesso 20/12–20/01 → 27/01/2027')
    await p.fill('#cInicio', '2026-04-17'); await p.fill('#cDias', '1'); await p.waitForTimeout(150)
    ok(/20\/04\/2026/.test(await p.locator('[data-testid=vencimento]').innerText()) && /22\/04\/2026/.test(await p.locator('#sPrazos .aviso').first().innerText()), 'calculadora: ponto facultativo do TJBA não desconta, mas avisa a data alternativa')
    await p.selectOption('#sPrazos select', 'trt5'); await p.waitForTimeout(300)
    ok(/22\/04\/2026/.test(await p.locator('[data-testid=vencimento]').innerText()), 'calculadora: TRT5 suspende 20/04')
    // atalhos
    ok(await p.locator('a.atalho:has-text("Meu INSS")').getAttribute('href') === 'https://meu.inss.gov.br' && await p.locator('button.atalho.vazio').count() === 1, 'atalhos: link pronto e "definir link" para o vazio')
    // abas
    await p.click('.tabs button:has-text("Leads")'); ok(/Em breve/.test(await p.locator('body').innerText()) && await p.locator('.secretaria a:has-text("CRM")').count() === 0, 'outras abas: só "em breve" (sem ligação com telas do CRM)')
    await p.click('.tabs button:has-text("Início")')
  }
  await p.screenshot({ path: `${process.env.SHOTS || '/tmp'}/sec-${nome}.png`, fullPage: true }); await ctx.close()
}
await b.close(); console.log(falhas ? falhas + ' FALHA(S)' : 'OK'); process.exit(falhas ? 1 : 0)
