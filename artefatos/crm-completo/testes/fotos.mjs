import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const S = process.argv[2]; const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const mk = async (w, h, dark) => { const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: dark ? 'dark' : 'light' }); const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=header]'); return p }
let p = await mk(1280, 900); await p.screenshot({ path: S + '/dash.png' })
await p.evaluate(() => ir('leads')); await p.waitForTimeout(100); await p.screenshot({ path: S + '/leads.png' })
await p.evaluate(() => abrirFicha(6)); await p.waitForTimeout(100); await p.screenshot({ path: S + '/ficha.png' })
await p.keyboard.press('Escape'); await p.evaluate(() => ir('formularios', { editar: 2 })); await p.waitForTimeout(100); await p.click('[data-testid="card-Tem filhos menores?"]'); await p.waitForTimeout(100); await p.screenshot({ path: S + '/builder.png', fullPage: true })
await p.evaluate(() => ir('mapa')); await p.waitForTimeout(100); await p.screenshot({ path: S + '/mapa.png', fullPage: true })
const m = await mk(390, 800, true); await m.screenshot({ path: S + '/mobile-dark.png' }); await m.click('[data-testid=menu-movel]'); await m.screenshot({ path: S + '/mobile-menu.png' })
p = await mk(1280, 900, true)
await p.evaluate(() => { UI.sec.aba = 'iniciais'; ir('secretaria') }); await p.waitForTimeout(100); await p.screenshot({ path: S + '/sec-dark.png' })
await p.evaluate(() => abrirDemandaDetalhe(2, 'processos')); await p.waitForTimeout(100); await p.evaluate(() => abrirProcesso(2)); await p.waitForTimeout(100); await p.screenshot({ path: S + '/processo-dark.png' })
await b.close()
