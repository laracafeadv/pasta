import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const S = process.argv[2]; const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const f = async (n, fn, full) => { await p.evaluate(fn); await p.waitForTimeout(150); await p.screenshot({ path: S + '/' + n + '.png', fullPage: !!full }) }
await f('n-inicio', () => ir('inicio')); await f('n-comunicacao', () => { UI.com.sel = 6; ir('comunicacao') }); await f('n-conexoes', () => ir('config', { aba: 'conexoes' }), true); await f('n-demandas', () => ir('demandas', { aba: 'documentos' }))
await b.close()
