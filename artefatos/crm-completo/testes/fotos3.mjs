import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const S = process.argv[2]; const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.on('pageerror', e => console.log('ERR', e.message))
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
await p.evaluate(() => { ir('agenda', { aba: 'tarefas' }) }); await p.click('[data-testid=nav-seta-pessoas]'); await p.click('[data-testid=nav-seta-demandas]'); await p.waitForTimeout(100); await p.screenshot({ path: S + '/b-barra.png' })
await p.click('[data-testid=botao-novo]'); await p.waitForTimeout(100); await p.screenshot({ path: S + '/b-novo.png', clip: { x: 0, y: 0, width: 640, height: 600 } })
await p.mouse.click(900, 500); await p.evaluate(() => ir('config', { aba: 'automacoes' })); await p.waitForTimeout(150); await p.screenshot({ path: S + '/b-auto.png' })
await b.close()
