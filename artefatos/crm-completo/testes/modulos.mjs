// Telas internas (modais/abas) do CRM completo: ficha, demanda, processo, documentos, mensagem, login/recuperação/privacidade, gráficos.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] }); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
const t = id => p.locator(`[data-testid="${id}"]`); const esp = (ms = 120) => p.waitForTimeout(ms); const txt = () => p.locator('[role=dialog]').last().innerText()
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
ok(await t('grafico-carga').count() === 1 && await t('grafico-receita').count() === 1, 'início: gráficos de carga e receita')
for (const aba of ['cliente', 'demandas', 'conversa', 'financeiro', 'historico']) { await p.evaluate(a => abrirFicha(6, a), aba); await esp(); ok((await txt()).length > 80, 'ficha aba ' + aba); await p.keyboard.press('Escape') }
await p.evaluate(() => abrirFicha(6, 'cliente')); await esp(); ok(/\*\*\*/.test(await txt()), 'CPF/RG mascarados na qualificação'); await p.keyboard.press('Escape')
for (const aba of ['visao', 'analise', 'processos', 'partes', 'docs', 'ficha']) { await p.evaluate(a => abrirDemandaDetalhe(1, a), aba); await esp(); ok((await txt()).length > 60, 'demanda aba ' + aba); await p.keyboard.press('Escape') }
await p.evaluate(() => abrirProcesso(1)); await esp(); ok(/Etapas do procedimento/.test(await txt()), 'procedimento extrajudicial: etapas e pendências'); await p.keyboard.press('Escape')
await p.evaluate(() => abrirProcesso(2)); await esp(); ok(/Movimentações/.test(await txt()), 'processo judicial: fases e movimentações'); await p.keyboard.press('Escape')
await p.evaluate(() => abrirMensagem(3, '/lembrete')); await esp(); const m = await p.locator('[data-testid=comp-texto]').inputValue(); ok(m.includes('Camila') && !m.includes('[NOME]'), 'modelo: variáveis [NOME] preenchidas'); await p.keyboard.press('Escape')
await p.evaluate(() => ir('documentos', { demanda: 1 })); await esp(); await p.locator('[data-testid=doc-status]').first().selectOption('conferido'); await esp(); ok(await p.evaluate(() => DB.documentos.find(d => d.caso_id === 1).status) === 'conferido', 'documento: mudar status')
await p.evaluate(() => ir('relatorios', {})); await p.evaluate(() => { UI.rel.aba = 'qualidade'; render() }); await esp(); await t('revisar').first().click(); await esp(); await t('revisao-salvar').click(); await esp(); ok(await p.evaluate(() => CONFIG.revisoes.length) === 1, 'qualidade: revisão por amostragem registrada')
await p.evaluate(() => ir('mapa')); await t('no-formularios').click(); await t('abrir-no').click(); await esp(); ok(await t('titulo-pagina').innerText() === 'Formulários', 'mapa operacional navega ao módulo')
ok(erros.length === 0, 'sem erros: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
