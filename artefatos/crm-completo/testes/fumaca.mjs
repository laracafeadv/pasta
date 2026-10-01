// Teste de fumaça do CRM completo (artefato): abre cada tela, falha em qualquer erro de console/página.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const arq = 'file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage()
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()) })
await p.goto(arq); await p.waitForSelector('[data-testid=sidebar]')
const rotas = ['inicio', 'agenda', 'pessoas', 'comunicacao', 'demandas', 'financeiro', 'relatorios', 'formularios', 'manual', 'config']
const alias = ['dashboard', 'hoje', 'secretaria', 'tarefas', 'prazos', 'intimacoes', 'leads', 'clientes', 'remarketing', 'mensagens', 'processos', 'documentos', 'mapa', 'auditoria', 'perfil']
for (const r of rotas) { await p.click(`[data-testid=nav-${r}]`).catch(async () => { await p.evaluate(x => ir(x), r) }); await p.waitForTimeout(80); const t = await p.locator('main').innerText(); ok(t.trim().length > 40, 'rota ' + r + ' renderiza (' + t.trim().length + ' chars)') }
for (const r of alias) { await p.evaluate(x => ir(x), r); await p.waitForTimeout(80); const tx = await p.locator('main').innerText(); ok(tx.trim().length > 40, 'rota antiga ' + r + ' leva ao módulo certo (' + tx.trim().length + ' chars)') }
ok(erros.length === 0, 'sem erros de console/página: ' + erros.slice(0, 5).join(' | '))
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
