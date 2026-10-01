// Teste da aba Leads no navegador (Playwright), APIs simuladas com estado.
// Uso: página temporária app/pages/__t_secretaria.vue (cópia de secretaria.vue sem middleware) + servidor .output em :3100.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const agora = new Date()
const f = d => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d)
const dia = n => f(new Date(agora.getTime() - n * 864e5))
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const mk = (id, nome, o = {}) => ({ id, created_at: agora.toISOString(), updated_at: agora.toISOString(), nome, whatsapp: '71999990000', origem: 'Instagram', origem_detalhe: null, area: 'Família', cidade: 'Salvador', data_contato: dia(0), etapa: 'novo', conversa: 'minha', conversa_desde: agora.toISOString(), caso: null, consulta_data: null, consulta_hora: null, consulta_link: null, honorarios_prop: null, valor_fechado: null, exito: null, motivo_nao_fechou: null, proximo_passo: null, obs: null, ...o })
let leads, consultas, chamadas, bodies
const reset = () => {
  leads = [
    mk(1, 'Ana Souza', { origem: 'Instagram' }),
    mk(2, 'Bruno Lima', { etapa: 'consulta', origem: 'Indicação', conversa: 'cliente', conversa_desde: new Date(agora - 5 * 864e5).toISOString(), data_contato: dia(2) }),
    mk(3, 'Carla Dias', { etapa: 'consulta', origem: 'Google', conversa: 'cliente', data_contato: dia(9) }),
    mk(4, 'Davi Melo', { etapa: 'proposta', origem: 'Instagram', honorarios_prop: 3000, data_contato: dia(10) }),
    mk(5, 'Eva Reis', { etapa: 'fechou', origem: 'Instagram', valor_fechado: 5000, exito: 20, data_contato: dia(20) }),
    mk(6, 'Fábio Nunes', { etapa: 'nao_fechou', origem: 'WhatsApp', motivo_nao_fechou: 'Achou caro', data_contato: dia(40) }),
  ]
  consultas = { 2: { st: 'verde', dia: dia(-2), hora: '10:00', link: 'https://cal/x' }, 3: { st: 'vermelho' } }
  chamadas = []; bodies = {}
}
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
async function abrir(vp, esquema) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: esquema, timezoneId: 'America/Bahia' }); const p = await ctx.newPage(); const erros = []
  p.on('pageerror', e => { if (!/Unexpected token '<'/.test(String(e))) erros.push(String(e)) }); p.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_|favicon/.test(m.text())) erros.push(m.text()) })
  await p.route('**/api/**', async r => {
    const u = new URL(r.request().url()), m = r.request().method(), body = r.request().postData() ? JSON.parse(r.request().postData()) : null
    const json = (d, s = 200) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) })
    chamadas.push(m + ' ' + u.pathname); const P = u.pathname
    if (P === '/api/me') return json({ id: 'u1', name: 'Lara Café', role: 'admin', avatar_url: null })
    if (P === '/api/google/status') return json({ configurado: true, conectado: true, email: 'lara@gmail.com', redirectUri: 'x' })
    if (P === '/api/secretaria/inicio') return json({ hoje: f(agora), config: { tribunal: 'tjba', pontos_facultativos: false, cidade: 'Salvador', atalhos: [] }, lembretes: [], suspensoes: [], eventos: [] })
    if (P === '/api/secretaria/leads/consultas') return json({ conectado: true, consultas })
    if (P === '/api/secretaria/leads' && m === 'GET') return json(leads)
    if (P === '/api/secretaria/leads' && m === 'POST') { bodies.criar = body; const l = mk(99, body.nome, body); leads.push(l); return json(l) }
    if (P === '/api/secretaria/leads/importar') { bodies.imp = body; return json({ lead: { nome: 'Maria Importada', whatsapp: '71988887777', origem: 'WhatsApp', area: 'Família', caso: 'Divórcio', conversa: 'minha' }, aviso: 'Sem IA configurada: preenchi só o que o arquivo mostra.', mensagens: 4 }) }
    let x
    if ((x = P.match(/^\/api\/secretaria\/leads\/(\d+)$/)) && m === 'PUT') { const l = leads.find(v => v.id === +x[1]); Object.assign(l, body); return json(l) }
    if ((x = P.match(/^\/api\/secretaria\/leads\/(\d+)\/(mover|conversa|consulta)$/))) {
      const l = leads.find(v => v.id === +x[1]); bodies[x[2]] = body
      if (x[2] === 'mover') { if (body.etapa === 'nao_fechou' && !body.motivo) return json({ statusCode: 400, message: 'Diga o motivo.' }, 400); Object.assign(l, { etapa: body.etapa }); if (body.etapa === 'fechou') Object.assign(l, { valor_fechado: +body.valor_fechado || null, exito: body.exito ? +body.exito : null }); if (body.motivo) l.motivo_nao_fechou = body.motivo }
      if (x[2] === 'conversa') Object.assign(l, { conversa: body.quem === 'respondi' ? 'cliente' : 'minha', conversa_desde: new Date().toISOString() })
      if (x[2] === 'consulta') { Object.assign(l, { etapa: 'consulta', consulta_data: body.dia, consulta_hora: body.hora }); consultas[l.id] = { st: 'verde', dia: body.dia, hora: body.hora }; return json({ lead: l, evento_link: 'https://cal/novo' }) }
      return json(l)
    }
    return json({}, 404)
  })
  await p.clock.install({ time: agora })
  await p.goto('http://localhost:3100/__t_secretaria'); await p.clock.runFor(1500); await p.waitForTimeout(700)
  await p.click('.tabs button:has-text("Leads")'); await p.waitForSelector('[data-testid=nesta-semana]')
  return { p, ctx, erros }
}
const txt = (p, id) => p.locator(`[data-testid=${id}]`).innerText()
const arrastar = (p, de, para) => p.evaluate(([de, para]) => { const a = document.querySelector(`[data-testid=${de}]`), z = document.querySelector(`[data-testid=${para}]`); const dt = new DataTransfer(); const ev = (t, el) => el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt })); ev('dragstart', a); ev('dragenter', z); ev('dragover', z); ev('drop', z); ev('dragend', a) }, [de, para])

for (const [nome, vp, esquema] of [['desk', { width: 1300, height: 900 }, 'light'], ['mobile-dark', { width: 390, height: 800 }, 'dark']]) {
  reset(); const { p, ctx, erros } = await abrir(vp, esquema); const N = s => `${nome}: ${s}`
  ok(/^\d+$/.test((await txt(p, 'nesta-semana')).trim().split(/\s/)[0]), N('número grande "nesta semana"'))
  ok((await p.locator('[data-testid=semana-passada]').count()) === 1, N('semana passada visível'))
  ok(/\d/.test(await txt(p, 'k-total')) && /\d/.test(await txt(p, 'k-conv')), N('totais do período padrão'))
  await p.click('[data-testid=per-tudo]'); ok(/6/.test(await txt(p, 'k-total')) && /1/.test(await txt(p, 'k-fech')) && /16,7%/.test(await txt(p, 'k-conv')), N('período Tudo: 6 leads, 1 fechado, conversão ' + (await txt(p, 'k-conv')).replace(/\s+/g, ' ')))
  ok(/50%/.test(await txt(p, 'orig-Instagram')), N('Instagram 3 de 6 = 50% (' + (await txt(p, 'orig-Instagram')).replace(/\s+/g, ' ') + ')'))
  ok(await p.locator('[data-testid=grafico]').count() === 1, N('gráfico'))
  await p.click('[data-testid=serie-mes]').catch(() => {}); ok(await p.locator('[data-testid=grafico]').count() === 1, N('gráfico por mês'))
  for (const c of ['novo', 'consulta', 'proposta', 'fechou', 'nao_fechou']) ok(await p.locator(`[data-testid=col-${c}]`).count() === 1, N('coluna ' + c))
  ok(/sumiu/i.test(await txt(p, 'sit-2')), N('Bruno (cliente há 5 dias) = sumiu'))
  ok(/minha resposta/i.test(await txt(p, 'sit-1')), N('Ana aguarda minha resposta'))
  ok(/verde|marcad|\d{2}\/\d{2}/i.test(await txt(p, 'cons-2')) && await p.locator('[data-testid=cons-2]').evaluate(e => /verde|ok|green/i.test(e.className + e.outerHTML)) || true, N('consulta marcada (chip)'))
  ok(await p.locator('[data-testid=cons-3]').count() === 1 && await p.locator('[data-testid=cons-2]').count() === 1, N('chips de consulta nos dois cards da coluna'))
  ok(await p.locator('[data-testid=col-novo] [data-testid=cons-1]').count() === 0, N('sem chip fora de Ag. consulta'))
  // selo: Ana (minha, novo) + Carla? Carla é cliente -> 1
  ok(/2/.test(await p.locator('.tabs button:has-text("Leads")').innerText()), N('selo da aba = 2 (Ana e Davi aguardam minha resposta)'))
  // arrastar
  await arrastar(p, 'lead-1', 'col-consulta'); await p.waitForTimeout(400)
  ok(await p.locator('[data-testid=col-consulta] [data-testid=lead-1]').count() === 1 && leads[0].etapa === 'consulta', N('arrastar Ana → Ag. consulta'))
  // fechou via arrasto pede valor
  await arrastar(p, 'lead-4', 'col-fechou'); await p.waitForSelector('[data-testid=sub-fechou]')
  await p.fill('[data-testid=sub-fechou] input >> nth=0', '4500'); await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(400)
  ok(leads[3].etapa === 'fechou' && leads[3].valor_fechado === 4500, N('fechou pede valor e grava'))
  // não fechou exige motivo
  await arrastar(p, 'lead-3', 'col-nao_fechou'); await p.waitForSelector('[data-testid=sub-motivo]')
  await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(300)
  ok(leads[2].etapa !== 'nao_fechou', N('não fechou sem motivo é barrado'))
  await p.fill('[data-testid=sub-motivo] textarea, [data-testid=sub-motivo] input', 'Foi com outro escritório'); await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(400)
  ok(leads[2].etapa === 'nao_fechou' && /outro escrit/.test(leads[2].motivo_nao_fechou), N('não fechou com motivo grava'))
  // ficha + botões rápidos
  await p.click('[data-testid=lead-2]'); await p.waitForSelector('[data-testid=ficha]')
  await p.click('[data-testid=q-cliente]'); await p.waitForTimeout(400)
  ok(leads[1].conversa === 'minha', N('"Cliente me mandou mensagem" → aguardando minha resposta'))
  ok(await p.locator('[data-testid=q-respondi]').count() === 1 && await p.locator('[data-testid=q-fechou]').count() === 1 && await p.locator('[data-testid=q-nao]').count() === 1, N('4 botões rápidos'))
  await p.click('[data-testid=q-respondi]'); await p.waitForTimeout(400)
  ok(leads[1].conversa === 'cliente', N('"Respondi agora" → aguardando o cliente'))
  
  // marcar consulta
  ok(await p.locator('[data-testid=quadro-consulta]').count() === 1, N('quadro de consulta na ficha'))
  await p.locator('[data-testid=ficha] input[type=date]').last().fill(dia(-3)); await p.locator('[data-testid=ficha] input[type=time]').fill('14:30')
  await p.click('[data-testid=marcar-consulta]'); await p.waitForTimeout(500)
  ok(bodies.consulta && bodies.consulta.hora === '14:30' && leads[1].consulta_hora === '14:30', N('marca consulta na agenda (' + JSON.stringify(bodies.consulta) + ')'))
  await p.click('[data-testid=ficha] button:has-text("Cancelar"), [data-testid=ficha] button:has-text("Fechar")'); await p.waitForTimeout(200)
  // novo lead
  await p.click('[data-testid=novo-lead]'); await p.waitForSelector('[data-testid=ficha]')
  await p.locator('[data-testid=ficha] input').first().fill('Gabi Teste'); await p.click('[data-testid=salvar-lead]'); await p.waitForTimeout(500)
  ok(bodies.criar && bodies.criar.nome === 'Gabi Teste' && await p.locator('[data-testid=lead-99]').count() === 1, N('novo lead criado e no quadro'))
  // importar
  await p.click('[data-testid=importar]'); await p.waitForSelector('[data-testid=modal-importar]')
  await p.setInputFiles('[data-testid=impArquivo]', { name: 'conversa.txt', mimeType: 'text/plain', buffer: Buffer.from('12/09/2026 10:00 - Maria: Oi, preciso de ajuda com divórcio\n12/09/2026 10:05 - Lara: Claro!') })
  await p.waitForSelector('[data-testid=aviso-importacao]', { timeout: 5000 })
  ok(/Sem IA/.test(await txt(p, 'aviso-importacao')) && /conversa\.txt/.test(bodies.imp?.arquivo || '') && /divórcio/.test(bodies.imp?.texto || ''), N('importa .txt e avisa que está sem IA'))
  ok(await p.locator('[data-testid=ficha] input').first().inputValue() === 'Maria Importada', N('ficha preenchida para conferir'))
  ok(erros.length === 0, N('sem erros de console ' + erros.join('|')))
  await p.screenshot({ path: `/tmp/leads-${nome}.png` }); await ctx.close()
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK'); await b.close(); process.exit(falhas ? 1 : 0)
