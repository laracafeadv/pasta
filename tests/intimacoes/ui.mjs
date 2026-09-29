// Interface das intimações (Playwright): registrar com prazo calculado, sem prazo, definir prazo, tratar, reabrir, excluir.
// API simulada em Node com as regras REAIS (server/utils/intimacoes.ts) sobre banco em memória.
// Uso: node tests/intimacoes/ui.mjs <harness5.mjs> <pasta-de-prints>
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/tmp/node_modules/playwright-core')
const H = await import(process.argv[2])
const SHOTS = process.argv[3]
const { banco, db, zerar, limparIntimacao, registrarIntimacao, definirPrazoIntimacao, tratarIntimacao, excluirIntimacao } = H
globalThis.createError = (o) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c, n) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

zerar()
db.contatos = [{ id: 1, nome: 'Maria Souza' }]
db.casos = [{ id: 1, contato_id: 1, titulo: 'Divórcio litigioso', tipo: 'judicial', status: 'ativo' }]
db.processos = [{ id: 10, caso_id: 1, contato_id: 1, natureza: 'judicial', numero: '0000123-45.2025.8.05.0001', tribunal: 'TJBA', orgao: '1ª Vara de Família', status: 'ativo' }]
for (const t of ['intimacoes', 'compromissos', 'tarefas_internas', 'movimentacoes', 'atividades']) db[t] = []
const ev = {}
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const embed = (i) => ({ ...i, processo: db.processos.find(p => p.id === i.processo_id), caso: db.casos.find(c => c.id === i.caso_id), contato: db.contatos.find(c => c.id === i.contato_id), compromisso: db.compromissos.find(c => c.id === i.compromisso_id) ?? null, tarefa: db.tarefas_internas.find(t => t.id === i.tarefa_id) ?? null })
async function api(route) {
  const req = route.request(); const u = new URL(req.url()); const path = u.pathname; const m = req.method()
  const body = () => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } }
  try {
    let r
    if (path === '/api/intimacoes' && m === 'GET') { const st = u.searchParams.get('status') ?? 'a_tratar'; return json(route, db.intimacoes.filter(i => st === 'todas' || i.status === st).map(embed)) }
    if (path === '/api/intimacoes' && m === 'POST') { const d = limparIntimacao(body()); return json(route, await registrarIntimacao(ev, banco, { conteudo: null, dias_prazo: null, data_trabalho: null, ...d }, null)) }
    if (path === '/api/processos') { const q = (u.searchParams.get('search') ?? '').toLowerCase(); return json(route, db.processos.filter(p => p.natureza === 'judicial' && (!q || (p.numero ?? '').includes(q) || db.contatos.find(c => c.id === p.contato_id).nome.toLowerCase().includes(q))).map(p => ({ ...p, contato: db.contatos.find(c => c.id === p.contato_id), caso: db.casos.find(c => c.id === p.caso_id) }))) }
    if ((r = path.match(/^\/api\/intimacoes\/(\d+)\/tratar$/)) && m === 'POST') return json(route, await tratarIntimacao(ev, banco, Number(r[1]), body(), null))
    if ((r = path.match(/^\/api\/intimacoes\/(\d+)$/)) && m === 'PUT') { const b = body(); const d = limparIntimacao(b, { parcial: true }); return json(route, { success: true, ...(d.dias_prazo ? await definirPrazoIntimacao(ev, banco, Number(r[1]), d.dias_prazo, null, null) : {}) }) }
    if ((r = path.match(/^\/api\/intimacoes\/(\d+)$/)) && m === 'DELETE') { await excluirIntimacao(banco, Number(r[1])); return json(route, {}) }
    return json(route, {})
  } catch (e) { return json(route, { statusCode: e.statusCode ?? 500, message: e.message }, e.statusCode ?? 500) }
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await (await browser.newContext({ viewport: { width: 1000, height: 1200 }, serviceWorkers: 'block' })).newPage()
const erros = []
page.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) erros.push(e.message) })
let respostaPrompt = '15'
page.on('dialog', d => d.type() === 'prompt' ? d.accept(respostaPrompt) : d.accept())
await page.route('**/api/**', api)
const T = id => page.locator(`[data-testid="${id}"]`)
await page.goto('http://localhost:3100/__t_intimacoes', { waitUntil: 'networkidle' })
ok((await page.locator('body').innerText()).includes('Nenhuma intimação a tratar'), 'fila vazia no começo')

// ── Registrar com prazo ──
await T('nova-intimacao').click()
await T('busca-processo').fill('maria')
await T('opcao-processo-10').click()
ok((await T('processo-escolhido').innerText()).includes('0000123-45.2025.8.05.0001'), 'processo escolhido por busca (número/cliente)')
await T('i-tipo').selectOption('Decisão')
await T('i-conteudo').fill('Determinada a manifestação sobre o laudo social.')
await T('i-dias').fill('15')
await T('previa-vencimento').waitFor()
ok(/Vencimento:/.test(await T('previa-vencimento').innerText()), 'pré-visualização do vencimento em dias úteis antes de salvar')
await page.screenshot({ path: `${SHOTS}/i-1-form.png`, fullPage: true })
await T('i-salvar').click()
await T('resultado').waitFor()
ok(/Intimação registrada/.test(await T('resultado').innerText()) && db.compromissos.length === 1 && db.tarefas_internas.length === 1 && db.movimentacoes.length === 1, 'registrada: prazo na agenda, tarefa e andamento criados')
await page.locator('button:has-text("Fechar")').click()
const card1 = page.locator('[data-testid^="intimacao-"]').first()
await card1.waitFor()
ok((await card1.innerText()).includes('Decisão') && /vence em \d+ dia/i.test(await card1.locator('[data-testid=situacao]').innerText()), 'aparece na fila com situação "vence em N dias"')

// ── Sem prazo: em destaque, e depois definir ──
await T('nova-intimacao').click()
await T('busca-processo').fill('0000123')
await T('opcao-processo-10').click()
await T('i-tipo').selectOption('Sentença')
await T('i-salvar').click()
await T('resultado').waitFor()
ok(/Sem prazo definido/.test(await T('resultado').innerText()) && db.tarefas_internas.some(t => t.titulo.includes('Analisar intimação')), 'sem prazo: avisa e cria a tarefa de análise')
await page.locator('button:has-text("Fechar")').click()
await page.waitForTimeout(300)
const primeiro = page.locator('[data-testid^="intimacao-"]').first()
ok((await primeiro.innerText()).includes('Sentença') && /sem prazo definido/i.test(await primeiro.locator('[data-testid=situacao]').innerText()), 'a intimação sem prazo vai para o TOPO da fila, marcada "Sem prazo definido"')
respostaPrompt = '10'
await primeiro.locator('[data-testid=definir-prazo]').click()
await page.waitForFunction(() => !document.querySelector('[data-testid^="intimacao-"] [data-testid=situacao]')?.textContent?.includes('Sem prazo'))
ok(db.compromissos.length === 2 && db.compromissos[1].dias_prazo === 10, 'definir prazo cria o prazo na agenda')
await page.screenshot({ path: `${SHOTS}/i-2-fila.png`, fullPage: true })

// ── Tratar / reabrir / filtros ──
respostaPrompt = 'Petição protocolada'
const alvo = page.locator('[data-testid^="intimacao-"]').first()
await alvo.locator('[data-testid=tratar]').click()
await page.waitForFunction(() => document.querySelectorAll('[data-testid^="intimacao-"]').length === 1)
ok(db.intimacoes.filter(i => i.status === 'tratada').length === 1 && db.compromissos.some(c => c.status === 'concluido') && db.tarefas_internas.some(t => t.concluida), 'tratar tira da fila e dá baixa no prazo e na tarefa')
await T('filtro-tratada').click()
await page.waitForSelector('text=Tratamento: Petição protocolada')
ok((await page.locator('[data-testid^="intimacao-"]').first().innerText()).includes('Petição protocolada'), 'aba Tratadas mostra o registro com o tratamento')
await page.locator('[data-testid^="intimacao-"]').first().locator('text=Reabrir').click()
await T('filtro-a_tratar').click()
await page.waitForFunction(() => document.querySelectorAll('[data-testid^="intimacao-"]').length === 2)
ok(db.intimacoes.every(i => i.status === 'a_tratar'), 'reabrir devolve à fila')
// excluir
await page.locator('[data-testid^="intimacao-"]').first().locator('text=Excluir').click()
await page.waitForFunction(() => document.querySelectorAll('[data-testid^="intimacao-"]').length === 1)
ok(db.intimacoes.length === 1, 'excluir tira da fila')
ok(erros.length === 0, `sem erros de JavaScript${erros.length ? ': ' + erros.join(' | ') : ''}`)
await browser.close()
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTESTE DE INTERFACE (INTIMAÇÕES): TODOS PASSARAM')
process.exit(falhas ? 1 : 0)
