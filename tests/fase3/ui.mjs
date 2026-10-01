// Interface da análise profissional (Playwright): salvar campos próprios, decisão, anotações datadas, exclusão.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/tmp/node_modules/playwright-core')
const SHOTS = process.argv[2]
let falhas = 0
const ok = (c, n) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const estado = { demanda: { id: 10, contato_id: 1, titulo: 'Pacto antenupcial', tipo: 'documental', status: 'ativo', analise: null, fatos: null, estrategia: null, riscos: null, conclusao: null, decisao: null }, notas: [], seq: 1 }
const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await (await browser.newContext({ viewport: { width: 900, height: 1200 }, serviceWorkers: 'block' })).newPage()
const erros = []
page.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) erros.push(e.message) })
page.on('dialog', d => d.accept())
const puts = []
await page.route('**/api/**', async (route) => {
  const u = new URL(route.request().url()).pathname, m = route.request().method()
  const body = () => JSON.parse(route.request().postData() || '{}')
  if (u === '/api/demandas/10' && m === 'GET') return json(route, estado.demanda)
  if (u === '/api/demandas/10' && m === 'PUT') { puts.push(body()); Object.assign(estado.demanda, body()); return json(route, estado.demanda) }
  if (u === '/api/demandas/10/notas' && m === 'GET') return json(route, [...estado.notas].reverse())
  if (u === '/api/demandas/10/notas' && m === 'POST') { const b = body(); estado.notas.push({ id: estado.seq++, created_at: new Date().toISOString(), caso_id: 10, tipo: b.tipo, texto: b.texto, autor_nome: 'Lara Café' }); return json(route, {}) }
  const del = u.match(/^\/api\/demanda-notas\/(\d+)$/)
  if (del && m === 'DELETE') { estado.notas = estado.notas.filter(n => n.id !== Number(del[1])); return json(route, { success: true }) }
  return json(route, {})
})
const T = id => page.locator(`[data-testid="${id}"]`)
await page.goto('http://localhost:3100/__t_analise', { waitUntil: 'networkidle' })
await T('analise-profissional').waitFor()
ok((await page.locator('body').innerText()).toLowerCase().includes('não é resposta de formulário'), 'aviso: análise profissional ≠ dados coletados')
ok(await T('an-salvar').isDisabled(), 'salvar desabilitado sem alteração')
await T('an-fatos').fill('Casal com patrimônio anterior ao casamento')
await T('an-fundamentos').fill('Art. 1.639 do CC: regime livremente estipulável por pacto (escritura pública).')
await T('an-estrategia').fill('Pacto por escritura pública antes do casamento; separação total.')
await T('an-riscos').fill('Sem registro no cartório de imóveis, não vale contra terceiros.')
await T('an-conclusao').fill('Viável. Recomendo separação total com cláusula de bens de família.')
await T('an-decisao-ressalvas').click()
ok(await T('an-salvar').isEnabled(), 'alteração habilita o salvar')
await page.screenshot({ path: `${SHOTS}/a-1-analise.png`, fullPage: true })
await T('an-salvar').click()
await page.waitForSelector('[data-testid=an-msg]:has-text("Salvo")')
const salvo = estado.demanda
ok(salvo.fatos.startsWith('Casal') && salvo.analise.includes('1.639') && salvo.estrategia.includes('separação total') && salvo.riscos.includes('terceiros') && salvo.conclusao.startsWith('Viável') && salvo.decisao === 'ressalvas', 'análise profissional persistida nos campos próprios da demanda')
ok(!('formulario' in puts[0]) && Object.keys(puts[0]).sort().join() === 'analise,conclusao,decisao,estrategia,fatos,riscos', 'salva só campos da análise (nenhum formulário/pergunta envolvido)')
// recarregar: valores voltam
await page.reload({ waitUntil: 'networkidle' })
await T('analise-profissional').waitFor()
ok(await T('an-fatos').inputValue() === 'Casal com patrimônio anterior ao casamento' && await T('an-conclusao').inputValue().then(v => v.startsWith('Viável')), 'após recarregar, a análise continua lá')
// anotações datadas
await T('nota-tipo').selectOption('anotacao')
await T('nota-texto').fill('Cliente confirmou regime de separação total.')
await T('nota-adicionar').click()
await page.waitForSelector('text=Cliente confirmou regime')
await T('nota-tipo').selectOption('conclusao')
await T('nota-texto').fill('Conclusão: minuta do pacto aprovada.')
await T('nota-adicionar').click()
await page.waitForSelector('text=minuta do pacto aprovada')
const ordem = await page.locator('[data-testid^="nota-"][data-testid$="1"], [data-testid^="nota-"]').evaluateAll(els => els.filter(e => /^nota-\d+$/.test(e.getAttribute('data-testid'))).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 90)))
ok(ordem.length === 2 && ordem[0].includes('minuta do pacto') && ordem[1].includes('separação total'), `anotações datadas, mais recente primeiro: ${JSON.stringify(ordem)}`)
ok((await page.locator('body').innerText()).toLowerCase().includes('conclusão') && estado.notas.length === 2, 'tipo da anotação (Anotação / Conclusão) aparece e persiste')
await page.screenshot({ path: `${SHOTS}/a-2-notas.png`, fullPage: true })
await page.locator('[data-testid="nota-1"] [title="Excluir anotação"]').click()
await page.waitForFunction(() => !document.querySelector('[data-testid="nota-1"]'))
ok(estado.notas.length === 1 && estado.notas[0].texto.startsWith('Conclusão'), 'excluir anotação remove só ela')
ok(estado.demanda.analise.includes('1.639'), 'a análise principal não foi afetada pelas anotações')
ok(erros.length === 0, `sem erros de JavaScript${erros.length ? ': ' + erros.join(' | ') : ''}`)
await browser.close()
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTESTE DE INTERFACE (ANÁLISE): TODOS PASSARAM')
process.exit(falhas ? 1 : 0)
