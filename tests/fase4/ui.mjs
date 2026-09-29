// Interface do processo judicial × procedimento extrajudicial (Playwright). API simulada em Node com as regras REAIS
// do servidor (server/utils/processos.ts) sobre banco em memória.
// Uso: node tests/fase4/ui.mjs <harness4.mjs> <pasta-de-prints>
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/tmp/node_modules/playwright-core')
const H = await import(process.argv[2])
const SHOTS = process.argv[3]
const { banco, db, zerar, limparProcesso, semearEtapas, sincronizarFase, concluirProcesso, reabrirProcesso, sincronizarAtuacao } = H
globalThis.createError = (o) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c, n) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }

zerar()
db.contatos = [{ id: 1, nome: 'Maria' }]
db.casos = [{ id: 1, contato_id: 1, titulo: 'Inventário — Roberto', tipo: 'consultivo', procedimento: 'inventario/extrajudicial', status: 'ativo' }]
db.processos = []; db.processo_etapas = []; db.processo_pendencias = []; db.movimentacoes = []; db.atividades = []
const ev = {}
async function criar(body) {
  const d = limparProcesso({ ...body, caso_id: 1 }, { criando: true })
  const { data: p } = await banco.from('processos').insert({ ...d, contato_id: 1, status: 'ativo', data_inicio: '2026-09-01' }).select().single()
  if (p.natureza === 'extrajudicial') await semearEtapas(banco, p.id, p.tipo_procedimento)
  await sincronizarAtuacao(banco, 1, ev, null)
  return p
}
const jud = await criar({ natureza: 'judicial', numero: '', tribunal: 'TJBA', orgao: '3ª Vara de Sucessões', comarca: 'Salvador', uf: 'BA', fase: 'Postulatória (petição inicial)', valor: 850000 })
const ext = await criar({ natureza: 'extrajudicial', tipo_procedimento: 'Inventário extrajudicial (escritura)', orgao: '2º Tabelionato de Notas', comarca: 'Salvador', uf: 'BA' })

const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
const hoje = () => new Date().toLocaleDateString('sv-SE')
async function api(route) {
  const req = route.request(); const u = new URL(req.url()).pathname; const m = req.method()
  const body = () => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } }
  try {
    let r
    if (u === '/api/__estado') return json(route, { processos: db.processos, movs: db.movimentacoes, etapas: db.processo_etapas, pendencias: db.processo_pendencias })
    if (u === '/api/equipe') return json(route, [{ id: 'e015740f-6b21-4286-a41a-00ad09f0e334', name: 'Lara Café' }])
    if ((r = u.match(/^\/api\/processo-etapas\/(\d+)$/)) && m === 'PUT') {
      const e = db.processo_etapas.find(x => x.id === Number(r[1])); const b = body()
      Object.assign(e, b.status ? { status: b.status, concluida_em: b.status === 'pendente' ? null : hoje() } : {}, 'data_prevista' in b ? { data_prevista: b.data_prevista } : {})
      await sincronizarFase(banco, e.processo_id); return json(route, e)
    }
    if ((r = u.match(/^\/api\/processo-etapas\/(\d+)$/)) && m === 'DELETE') { const e = db.processo_etapas.find(x => x.id === Number(r[1])); db.processo_etapas = db.processo_etapas.filter(x => x !== e); await sincronizarFase(banco, e.processo_id); return json(route, {}) }
    if ((r = u.match(/^\/api\/processos\/(\d+)\/etapas$/)) && m === 'POST') { const id = Number(r[1]); const ord = Math.max(0, ...db.processo_etapas.filter(e => e.processo_id === id).map(e => e.ordem)) + 1; db.processo_etapas.push({ id: 900 + ord, processo_id: id, ordem: ord, titulo: body().titulo, status: 'pendente', data_prevista: null }); await sincronizarFase(banco, id); return json(route, {}) }
    if ((r = u.match(/^\/api\/processos\/(\d+)\/pendencias$/)) && m === 'POST') { const b = body(); db.processo_pendencias.push({ id: db.processo_pendencias.length + 1, processo_id: Number(r[1]), descricao: b.descricao, aguardando: b.aguardando, prazo: b.prazo, resolvida_em: null }); return json(route, {}) }
    if ((r = u.match(/^\/api\/processo-pendencias\/(\d+)$/)) && m === 'PUT') { const p = db.processo_pendencias.find(x => x.id === Number(r[1])); p.resolvida_em = body().resolvida ? hoje() : null; return json(route, p) }
    if ((r = u.match(/^\/api\/processos\/(\d+)\/movimentacoes$/)) && m === 'POST') { const b = body(); db.movimentacoes.unshift({ id: db.movimentacoes.length + 1, processo_id: Number(r[1]), data: b.data, tipo: b.tipo, texto: b.texto }); return json(route, {}) }
    if ((r = u.match(/^\/api\/processos\/(\d+)\/concluir$/)) && m === 'POST') return json(route, await concluirProcesso(ev, banco, Number(r[1]), body(), null))
    if ((r = u.match(/^\/api\/processos\/(\d+)$/)) && m === 'PUT') { const id = Number(r[1]); const atual = db.processos.find(p => p.id === id); if (body().status === 'ativo' && atual.status === 'encerrado') { await reabrirProcesso(ev, banco, id, null); return json(route, atual) } const d = limparProcesso({ ...body(), natureza: atual.natureza }); delete d.caso_id; delete d.natureza; Object.assign(atual, d); return json(route, atual) }
    if (u === '/api/processos' && m === 'POST') return json(route, await criar(body()))
    return json(route, {})
  } catch (e) { return json(route, { statusCode: e.statusCode ?? 500, message: e.message }, e.statusCode ?? 500) }
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const page = await (await browser.newContext({ viewport: { width: 1000, height: 1300 }, serviceWorkers: 'block' })).newPage()
const erros = []
page.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) erros.push(e.message) })
page.on('dialog', d => d.accept())
await page.route('**/api/**', api)
const T = id => page.locator(`[data-testid="${id}"]`)
const card = id => page.locator(`[data-testid="processo-${id}"]`)
await page.goto('http://localhost:3100/__t_processo', { waitUntil: 'networkidle' })
await card(jud.id).waitFor()

// ── Cabeçalhos: cada natureza mostra o que é dela ──
const tj = (await card(jud.id).innerText()).toLowerCase(), te = (await card(ext.id).innerText()).toLowerCase() // (rótulos usam CSS uppercase)
ok(tj.includes('processo judicial') && tj.includes('tjba') && tj.includes('3ª vara') && tj.includes('fase: postulatória') && tj.includes('distribuição pendente') && !tj.includes('etapas'), 'judicial mostra tribunal, vara, fase e "distribuição pendente" (sem etapas de cartório)')
ok(te.includes('procedimento extrajudicial') && te.includes('inventário extrajudicial (escritura)') && te.includes('2º tabelionato') && te.includes('etapa: protocolo') && te.includes('0 de 7 etapas') && !te.includes('tjba') && !te.includes('fase:'), 'extrajudicial mostra tipo, cartório, ETAPA em andamento e progresso (sem tribunal/fase processual)')
ok(await card(ext.id).locator('[data-testid=ver-etapas]').count() === 1 && await card(jud.id).locator('[data-testid=ver-etapas]').count() === 0, 'só o extrajudicial tem "Etapas"')
ok(/encerrar processo/.test(tj) && /concluir procedimento/.test(te), 'ações com o vocabulário de cada fluxo')
await page.screenshot({ path: `${SHOTS}/p-1-cards.png`, fullPage: true })

// ── Extrajudicial: etapas ──
await card(ext.id).locator('[data-testid=ver-etapas]').click()
ok(await page.locator(`[data-testid="processo-${ext.id}"] [data-testid^="etapa-"][data-testid$="1"]`).count() >= 1, 'etapas do modelo listadas')
await card(ext.id).locator('[data-testid="etapa-check-1"]').click()
await page.waitForFunction((id) => document.querySelector(`[data-testid="processo-${id}"]`)?.innerText.toLowerCase().includes('etapa: análise da documentação'), ext.id)
ok(true, 'concluir a 1ª etapa avança a fase para a seguinte')
await card(ext.id).locator('[data-testid="etapa-dispensar-3"]').click()
await page.waitForFunction((id) => document.querySelector(`[data-testid="processo-${id}"]`)?.innerText.toLowerCase().includes('dispensada'), ext.id)
ok(db.processo_etapas.find(e => e.processo_id === ext.id && e.ordem === 3).status === 'dispensada', 'etapa dispensada')
await card(ext.id).locator('[data-testid=etapa-nova]').fill('Cumprir exigência do cartório')
await card(ext.id).locator('[data-testid=etapa-adicionar]').click()
await page.waitForFunction((id) => document.querySelector(`[data-testid="processo-${id}"]`)?.innerText.includes('Cumprir exigência'), ext.id)
ok(db.processo_etapas.filter(e => e.processo_id === ext.id).length === 8, 'etapa própria acrescentada')

// ── Pendências: bloqueiam a conclusão ──
await card(ext.id).locator('[data-testid=ver-pendencias]').click()
await card(ext.id).locator('[data-testid=pend-descricao]').fill('Certidão de ônus atualizada')
await card(ext.id).locator('[data-testid=pend-aguardando]').selectOption('cliente')
await card(ext.id).locator('[data-testid=pend-adicionar]').click()
await page.waitForFunction((id) => document.querySelector(`[data-testid="processo-${id}"]`)?.innerText.includes('Certidão de ônus'), ext.id)
ok(/1 pendência\(s\) em aberto/.test((await card(ext.id).innerText()).toLowerCase()), 'pendência (exigência) registrada e contada')
await card(ext.id).locator('[data-testid=concluir]').click()
await card(ext.id).locator('[data-testid=desfecho]').selectOption('Escritura lavrada')
await card(ext.id).locator('[data-testid=confirmar-conclusao]').click()
await card(ext.id).locator('[data-testid=erro-conclusao]').waitFor()
ok(/etapas pendentes/.test(await card(ext.id).locator('[data-testid=erro-conclusao]').innerText()), 'conclusão de sucesso é recusada com etapas pendentes (mensagem clara)')
ok(db.processos.find(p => p.id === ext.id).status === 'ativo', 'nada foi encerrado')
await page.screenshot({ path: `${SHOTS}/p-2-etapas-pendencias.png`, fullPage: true })

// cumprir tudo → ainda há pendência
for (const e of db.processo_etapas.filter(x => x.processo_id === ext.id && x.status === 'pendente')) { e.status = 'concluida'; e.concluida_em = hoje() }
await sincronizarFase(banco, ext.id)
await page.reload({ waitUntil: 'networkidle' })
await card(ext.id).locator('[data-testid=concluir]').click()
await card(ext.id).locator('[data-testid=desfecho]').selectOption('Escritura lavrada e registrada / averbada')
await card(ext.id).locator('[data-testid=confirmar-conclusao]').click()
await card(ext.id).locator('[data-testid=erro-conclusao]').waitFor()
ok(/pendência\(s\) em aberto/.test(await card(ext.id).locator('[data-testid=erro-conclusao]').innerText()), 'com pendência aberta, não conclui')
await card(ext.id).locator('[data-testid=ver-pendencias]').click()
await card(ext.id).locator('[data-testid^="pendencia-check-"]').first().click()
await page.waitForFunction((id) => !!document.querySelector(`[data-testid="processo-${id}"] .line-through`), ext.id)
if (!(await card(ext.id).locator('[data-testid=desfecho]').count())) await card(ext.id).locator('[data-testid=concluir]').click()
await card(ext.id).locator('[data-testid=desfecho]').selectOption('Escritura lavrada e registrada / averbada')
await card(ext.id).locator('[data-testid=confirmar-conclusao]').click()
await card(ext.id).locator('[data-testid=form-concluir]').waitFor({ state: 'detached' })
const pe = db.processos.find(p => p.id === ext.id)
ok(pe.status === 'encerrado' && pe.desfecho.startsWith('Escritura lavrada e registrada'), 'procedimento concluído com desfecho próprio')
ok(/escritura lavrada e registrada/.test((await card(ext.id).innerText()).toLowerCase()) && await card(ext.id).locator('[data-testid=aviso-demanda]').count() === 0, 'cartão mostra o desfecho; sem sugerir encerrar a demanda enquanto o processo judicial dela segue ativo')
await page.screenshot({ path: `${SHOTS}/p-3-concluido.png`, fullPage: true })

// ── Judicial: movimentações, fase, conclusão sem etapas ──
await card(jud.id).locator('[data-testid=ver-movimentacoes]').click()
await card(jud.id).locator('[data-testid=mov-texto]').fill('Distribuída a inicial; inventariante nomeada')
await card(jud.id).locator('[data-testid=mov-registrar]').click()
await page.waitForFunction((id) => document.querySelector(`[data-testid="processo-${id}"]`)?.innerText.includes('inventariante nomeada'), jud.id)
ok(db.movimentacoes.some(m => m.processo_id === jud.id), 'movimentação registrada no processo judicial')
await card(jud.id).locator('[data-testid=concluir]').click()
const opcoesJ = await card(jud.id).locator('[data-testid=desfecho] option').allInnerTexts()
ok(opcoesJ.some(o => o.includes('Acordo homologado')) && !opcoesJ.some(o => o.includes('Escritura')), 'desfechos do judicial (sentença, acordo…) — nada de cartório')
await card(jud.id).locator('[data-testid=desfecho]').selectOption('Partilha homologada (sentença / formal de partilha)')
await card(jud.id).locator('[data-testid=confirmar-conclusao]').click()
await card(jud.id).locator('[data-testid=aviso-demanda]').waitFor()
ok(db.processos.find(p => p.id === jud.id).status === 'encerrado' && /encerre a demanda/.test(await card(jud.id).locator('[data-testid=aviso-demanda]').innerText()), 'judicial conclui sem exigir etapas; com tudo concluído, sugere encerrar a demanda')
await card(jud.id).locator('[data-testid=reabrir]').click()
await page.waitForFunction((id) => !document.querySelector(`[data-testid="processo-${id}"] [data-testid=reabrir]`), jud.id)
ok(db.processos.find(p => p.id === jud.id).status === 'ativo' && db.processos.find(p => p.id === jud.id).desfecho === null, 'reabrir o processo')

// ── Formulários: campos próprios de cada natureza ──
await T('abrir-jud').click()
await T('pf-cnj').waitFor()
const modalJ = await page.locator('form#processo-form').innerText()
ok(await T('pf-tribunal').count() === 1 && await T('pf-vara').count() === 1 && await T('pf-fase').count() === 1 && await T('pf-tipo').count() === 0 && await T('pf-cartorio').count() === 0, 'formulário judicial: CNJ, tribunal, vara, fase — sem tipo de procedimento nem cartório')
await T('pf-cnj').fill('1234567-00.2026.8.05.0001')
ok(/Dígito verificador não confere/.test(await page.locator('form#processo-form').innerText()), 'CNJ inválido é sinalizado na hora')
await page.locator('button:has-text("Cancelar")').last().click()
await T('abrir-ext').click()
await T('pf-tipo').waitFor()
ok(await T('pf-tipo').count() === 1 && await T('pf-cartorio').count() === 1 && await T('pf-tribunal').count() === 0 && await T('pf-cnj').count() === 0 && await T('pf-fase').count() === 0, 'formulário extrajudicial: tipo de procedimento e cartório — sem CNJ, tribunal, vara nem fase')
ok(await T('pf-tipo').inputValue() === 'Inventário extrajudicial (escritura)', 'o tipo vem sugerido pelo serviço da demanda (inventário)')
await page.screenshot({ path: `${SHOTS}/p-4-form-extra.png`, fullPage: true })
ok(erros.length === 0, `sem erros de JavaScript${erros.length ? ': ' + erros.join(' | ') : ''}`)
await browser.close()
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTESTE DE INTERFACE (JUDICIAL × EXTRAJUDICIAL): TODOS PASSARAM')
process.exit(falhas ? 1 : 0)
