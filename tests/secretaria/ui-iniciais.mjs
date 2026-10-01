// Teste da aba Iniciais (e da integração com o Início) no navegador (Playwright), APIs simuladas com estado.
// Uso: página temporária app/pages/__t_secretaria.vue (cópia de secretaria.vue sem middleware) + servidor .output em :3100.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const agora = new Date()
const f = d => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d)
const dia = n => f(new Date(agora.getTime() + n * 864e5))
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const mk = (id, cliente, o = {}) => ({ id, created_at: agora.toISOString(), updated_at: agora.toISOString(), cliente, acao: null, area: 'Família', parte_contraria: null, meta_protocolo: null, prazo_fatal: null, prazo_fatal_tipo: null, prioridade: 'normal', etapa: 'aguardando', etapa_desde: new Date(agora - 3 * 864e5).toISOString(), checklist: [], obs: null, processo_numero: null, protocolo_data: null, ...o })
const cl = (...t) => t.map((x, i) => ({ id: 'd' + i + x, texto: x, ok: false }))
// DV válido para o número de teste
const cnj = (() => { for (let d = 0; d < 100; d++) { const n = `0000123-${String(d).padStart(2, '0')}.2026.8.05.0001`; const g = n.replace(/\D/g, ''); let r = 0; for (const c of g.slice(0, 7) + g.slice(9) + g.slice(7, 9)) r = (r * 10 + +c) % 97; if (r === 1) return n } })()
let inis, chamadas, bodies
const reset = () => {
  inis = [
    mk(1, 'Ana Souza', { acao: 'Divórcio litigioso', etapa: 'aguardando', meta_protocolo: dia(-2), prioridade: 'alta', checklist: cl('Certidão de casamento', 'Comprovante de renda') }),
    mk(2, 'Bruno Lima', { acao: 'Pensão por morte', area: 'Previdenciário', etapa: 'redacao', meta_protocolo: dia(1), prazo_fatal: dia(3), prazo_fatal_tipo: 'prescricao' }),
    mk(3, 'Carla Dias', { etapa: 'aguardando', meta_protocolo: dia(6) }),
    mk(4, 'Davi Melo', { acao: 'Inventário judicial', area: 'Sucessões', etapa: 'revisao', meta_protocolo: dia(40), checklist: cl('Certidão de óbito') }),
    mk(5, 'Eva Reis', { etapa: 'pronta', meta_protocolo: dia(20) }),
    mk(6, 'Fábio Nunes', { etapa: 'protocolada', protocolo_data: dia(-5), processo_numero: cnj, meta_protocolo: dia(-8) }),
    mk(7, 'João Pedro Santos', { acao: 'Aposentadoria por idade', area: 'Previdenciário', etapa: 'produzir', meta_protocolo: dia(30), checklist: cl('CTPS', 'CNIS') }),
    mk(8, 'Maria Souza', { etapa: 'redacao', meta_protocolo: dia(25) }),
  ]
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
    if (P === '/api/google/status') return json({ configurado: true, conectado: false, email: null, redirectUri: 'x' })
    if (P === '/api/secretaria/inicio') return json({ hoje: f(agora), config: { tribunal: 'tjba', pontos_facultativos: false, cidade: 'Salvador', atalhos: [] }, lembretes: [], suspensoes: [], eventos: [] })
    if (P === '/api/secretaria/leads') return json([])
    if (P === '/api/secretaria/iniciais' && m === 'GET') return json(inis)
    if (P === '/api/secretaria/iniciais' && m === 'POST') { bodies.criar = body; const l = mk(99, body.cliente, body); inis.push(l); return json(l) }
    let x
    if ((x = P.match(/^\/api\/secretaria\/iniciais\/(\d+)$/)) && m === 'PUT') { const l = inis.find(v => v.id === +x[1]); bodies.put = body; Object.assign(l, body); return json(l) }
    if ((x = P.match(/^\/api\/secretaria\/iniciais\/(\d+)\/mover$/))) {
      const l = inis.find(v => v.id === +x[1]); bodies.mover = body
      const pend = l.checklist.filter(c => !c.ok).length
      if ((body.etapa === 'pronta' || body.etapa === 'protocolada') && pend && body.confirmar_pendencias !== true) return json({ statusCode: 409, message: 'Ainda há ' + pend + ' documento(s) pendente(s).' }, 409)
      if (body.etapa === 'protocolada' && !body.protocolo_data) return json({ statusCode: 400, message: 'Informe a data do protocolo.' }, 400)
      Object.assign(l, { etapa: body.etapa, etapa_desde: new Date().toISOString() }); if (body.etapa === 'protocolada') Object.assign(l, { protocolo_data: body.protocolo_data, processo_numero: body.processo_numero ?? null })
      return json(l)
    }
    return json({}, 404)
  })
  await p.clock.install({ time: agora })
  await p.goto('http://localhost:3100/__t_secretaria'); await p.clock.runFor(1500); await p.waitForTimeout(700)
  return { p, ctx, erros }
}
const txt = (p, id) => p.locator(`[data-testid="${id}"]`).innerText()
const aba = p => p.locator('.tabs button:has-text("Iniciais")')
const arrastar = (p, de, para) => p.evaluate(([de, para]) => { const a = document.querySelector(`[data-testid="${de}"]`), z = document.querySelector(`[data-testid="${para}"]`); const dt = new DataTransfer(); const ev = (t, el) => el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt })); ev('dragstart', a); ev('dragenter', z); ev('dragover', z); ev('drop', z); ev('dragend', a) }, [de, para])

for (const [nome, vp, esquema] of [['desk', { width: 1300, height: 900 }, 'light'], ['mobile-dark', { width: 390, height: 800 }, 'dark']]) {
  reset(); const { p, ctx, erros } = await abrir(vp, esquema); const N = s => `${nome}: ${s}`
  // ── Início: Hoje, número da aba e campo
  ok((await aba(p).innerText()).replace(/\D/g, '') === '2', N('número da aba = 2 (Ana atrasada e Bruno vence amanhã)'))
  const tile = await txt(p, 'tile-iniciais')
  ok(/Iniciais atrasadas ou a vencer/i.test(tile) && /\b2\b/.test(tile) && /Ana Souza/.test(tile) && /Bruno Lima/.test(tile) && !/Carla/.test(tile), N('faixa Hoje: tile com Ana e Bruno (Carla, a 6 dias, fica de fora)'))
  await p.fill('#nlTxt', 'quais iniciais estão atrasadas?'); await p.click('[data-testid=interpretar]')
  ok(/Ana Souza/.test(await txt(p, 'consulta-itens')) && !/Bruno/.test(await txt(p, 'consulta-itens')), N('campo enxerga as iniciais: lista as atrasadas'))
  await p.fill('#nlTxt', 'inicial do João Pedro: falta PPP'); await p.click('[data-testid=interpretar]')
  ok(await p.locator('[data-testid=ini-doc]').inputValue() === 'PPP', N('campo: "falta PPP" vira documento pendente da inicial certa'))
  await p.click('[data-testid=confirmar-inicial]'); await p.waitForTimeout(400)
  ok(bodies.put && bodies.put.checklist.some(c => c.texto === 'PPP') && inis[6].checklist.length === 3, N('confirmar grava o PPP no checklist'))
  await p.fill('#nlTxt', 'recebi a CTPS da inicial do João Pedro'); await p.click('[data-testid=interpretar]'); await p.click('[data-testid=confirmar-inicial]'); await p.waitForTimeout(400)
  ok(inis[6].checklist.find(c => c.texto === 'CTPS').ok === true, N('campo: "recebi CTPS" marca o documento'))
  await p.fill('#nlTxt', 'nova inicial de divórcio para Ana Lima, meta dia 20/10'); await p.click('[data-testid=interpretar]')
  ok(/Ana Lima/.test(await p.locator('[data-testid=proposta-inicial] input').first().inputValue()), N('campo: nova inicial entende o cliente'))
  await p.click('[data-testid=confirmar-inicial]'); await p.waitForTimeout(400)
  ok(bodies.criar && bodies.criar.cliente === 'Ana Lima' && bodies.criar.acao === 'Divórcio litigioso' && bodies.criar.area === 'Família' && bodies.criar.etapa === 'aguardando', N('nova inicial criada em Aguardando documentos (' + JSON.stringify(bodies.criar) + ')'))
  await p.fill('#nlTxt', 'me lembra de ligar para Maria Souza amanhã'); await p.click('[data-testid=interpretar]')
  ok(await p.locator('[data-testid=proposta]').count() === 1 && await p.locator('[data-testid=proposta-inicial]').count() === 0, N('texto sem "inicial" segue o fluxo normal (lembrete)'))
  await p.click('[data-testid=resumo]'); ok(/INICIAIS: 1 atrasada/.test(await txt(p, 'resumo-texto')), N('resumo do dia cita as iniciais'))
  await p.click('[data-testid=tile-iniciais]'); await p.waitForSelector('[data-testid=nova-inicial]')
  // ── aba Iniciais
  ok(/9|8/.test(await txt(p, 'k-andamento')) && await txt(p, 'k-atrasadas') === '1' && /^[0-9]+$/.test(await txt(p, 'k-vencendo')), N('resumo: andamento, atrasadas e vencendo'))
  ok(await txt(p, 'k-vencendo') === '2', N('vencendo em 7 dias = 2 (Bruno e Carla; a nova Ana Lima tem meta em 19 dias)'))
  for (const c of ['aguardando', 'produzir', 'redacao', 'revisao', 'pronta', 'protocolada']) ok(await p.locator(`[data-testid=col-${c}]`).count() === 1, N('coluna ' + c))
  ok(await p.locator('[data-testid=faixa-1-meta]').count() === 1 && await p.locator('[data-testid=faixa-2-fatal]').count() === 1 && await p.locator('[data-testid=faixa-2-meta]').count() === 1 && await p.locator('[data-testid=faixa-3-meta]').count() === 1 && await p.locator('[data-testid=faixa-5-meta]').count() === 0, N('faixa de 7 dias: Ana (vencida), Bruno (meta e fatal) e Carla; Eva (20 dias) fora'))
  ok(/vencido há 2 dias/.test(await txt(p, 'faixa-1-meta')), N('vencida aparece marcada'))
  ok(/vencido há 2/.test(await txt(p, 'alerta-1')) && /amanhã/.test(await txt(p, 'alerta-2')), N('cards: alerta de atraso e de amanhã'))
  ok(await p.locator('[data-testid=prio-1]').count() === 1 && /2 documentos pendentes/.test(await txt(p, 'docs-1')), N('card: prioridade alta e 2 documentos pendentes'))
  ok(/sem nº|0000123/.test(await txt(p, 'prot-6')) && await p.locator('[data-testid=avancar-6]').count() === 0, N('protocolada: mostra data/nº e não tem Avançar'))
  // busca e filtro
  await p.fill('[data-testid=busca]', 'ben'); ok(await p.locator('[data-testid^="ini-"]').count() === 0, N('busca sem resultado'))
  await p.fill('[data-testid=busca]', 'BRUNO'); ok(await p.locator('[data-testid^="ini-"]').count() === 1, N('busca por cliente (sem diferenciar caixa)'))
  await p.fill('[data-testid=busca]', '0000123'); ok(await p.locator('[data-testid="ini-6"]').count() === 1, N('busca por nº do processo'))
  await p.fill('[data-testid=busca]', ''); await p.selectOption('[data-testid=filtro-area]', 'Previdenciário')
  ok(await p.locator('[data-testid^="ini-"]').count() === 2, N('filtro por área: 2 previdenciárias')); await p.selectOption('[data-testid=filtro-area]', '')
  // Avançar
  await p.click('[data-testid=avancar-3]'); await p.waitForTimeout(400)
  ok(inis[2].etapa === 'produzir' && await p.locator('[data-testid=col-produzir] [data-testid=ini-3]').count() === 1, N('Avançar: Aguardando documentos → A produzir'))
  await p.click('[data-testid=avancar-4]'); await p.waitForSelector('[data-testid=sub-pendencias]')
  ok(/Certidão de óbito/.test(await txt(p, 'aviso-pendencias')) && inis[3].etapa === 'revisao', N('Revisão → Pronta com documento pendente: pede confirmação (nada muda)'))
  await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(400)
  ok(inis[3].etapa === 'pronta' && bodies.mover.confirmar_pendencias === true, N('"Avançar mesmo assim" move'))
  await p.click('[data-testid=avancar-5]'); await p.waitForSelector('[data-testid=sub-protocolar]')
  await p.fill('#pNumero', '1234567'); await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(300)
  ok(/CNJ/.test(await txt(p, 'sub-protocolar')) && inis[4].etapa === 'pronta', N('protocolar com número inválido é barrado'))
  await p.fill('#pNumero', cnj.replace(/\D/g, '')); await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(400)
  ok(inis[4].etapa === 'protocolada' && inis[4].processo_numero === cnj && inis[4].protocolo_data === dia(0) && /0000123/.test(await txt(p, 'prot-5')), N('protocolar guarda data (hoje) e número formatado'))
  // arrastar
  await arrastar(p, 'ini-2', 'col-protocolada'); await p.waitForSelector('[data-testid=sub-protocolar]'); await p.click('[data-testid=sub-confirmar]'); await p.waitForTimeout(400)
  ok(inis[1].etapa === 'protocolada' && inis[1].processo_numero === null && /sem nº/.test(await txt(p, 'prot-2')), N('arrastar para Protocolada pede a data; número pode ficar para depois'))
  ok((await aba(p).innerText()).replace(/\D/g, '') === '1', N('número da aba cai para 1 depois de protocolar a do Bruno'))
  await arrastar(p, 'ini-3', 'col-redacao'); await p.waitForTimeout(400)
  ok(inis[2].etapa === 'redacao', N('arrastar entre colunas'))
  // ficha: nova inicial
  await p.click('[data-testid=nova-inicial]'); await p.waitForSelector('[data-testid=ficha]')
  ok(await p.locator('[data-testid=sug-acoes] button').count() >= 3, N('ficha: sugestões de ação'))
  await p.selectOption('#iArea', 'Previdenciário')
  ok(await p.locator('[data-testid="sug-CTPS"]').count() === 1 && await p.locator('[data-testid="sug-CNIS"]').count() === 1 && await p.locator('[data-testid="sug-PPP"]').count() === 1, N('ficha: Previdenciário sugere CTPS, CNIS e PPP'))
  await p.click('[data-testid="sug-CTPS"]'); await p.click('[data-testid="sug-PPP"]')
  ok(await p.locator('[data-testid="sug-CTPS"]').count() === 0 && await p.locator('[data-testid="doc-CTPS"]').count() === 1, N('sugestão vira item e some das sugestões'))
  await p.fill('[data-testid=novo-doc]', 'Laudo médico'); await p.click('[data-testid=add-doc]')
  await p.fill('#iCliente', 'Gabi Teste'); await p.fill('#iMeta', dia(10)); await p.fill('#iFatal', dia(5))
  await p.click('[data-testid=salvar-inicial]'); await p.waitForTimeout(300)
  ok(/depois do prazo fatal/.test(await txt(p, 'erro-ficha')), N('meta depois do prazo fatal: bloqueia com mensagem'))
  await p.fill('#iMeta', dia(4)); await p.selectOption('#iFatalTipo', 'decadencia'); await p.selectOption('#iPrio', 'alta'); await p.fill('#iParte', 'Empresa X')
  await p.click('[data-testid=salvar-inicial]'); await p.waitForTimeout(500)
  ok(bodies.criar.cliente === 'Gabi Teste' && bodies.criar.checklist.length === 3 && bodies.criar.prazo_fatal_tipo === 'decadencia' && bodies.criar.prioridade === 'alta' && bodies.criar.parte_contraria === 'Empresa X', N('nova inicial salva com checklist, prazo fatal e prioridade'))
  // editar: marcar documento e salvar
  await p.click('[data-testid="ini-1"]'); await p.waitForSelector('[data-testid=ficha]')
  await p.check('[data-testid="doc-Comprovante de renda"]'); await p.click('[data-testid=salvar-inicial]'); await p.waitForTimeout(400)
  ok(inis[0].checklist.find(c => c.texto === 'Comprovante de renda').ok === true && /1 documento pendente/.test(await txt(p, 'docs-1')), N('marcar documento na ficha atualiza o card'))
  // Evitar erro: protocolada vai à ficha com campos de protocolo
  await p.click('[data-testid="ini-6"]'); await p.waitForSelector('[data-testid=quadro-protocolo]'); ok(await p.locator('#iProc').inputValue() === cnj, N('ficha da protocolada mostra número e data'))
  await p.click('[data-testid=ficha] button:has-text("Cancelar")')
  ok(erros.length === 0, N('sem erros de console ' + erros.join('|')))
  await p.screenshot({ path: `/tmp/iniciais-${nome}.png`, fullPage: false }); await ctx.close()
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK'); await b.close(); process.exit(falhas ? 1 : 0)
