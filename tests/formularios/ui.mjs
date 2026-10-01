// Teste de interface do construtor (Playwright + Chromium) sobre o app compilado. As rotas /api são simuladas em Node
// usando as regras REAIS do servidor (server/utils/formularioEstrutura.ts) sobre um banco em memória.
// Uso: node tests/formularios/ui.mjs <harness.mjs> <pasta-de-prints>
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('/tmp/node_modules/playwright-core')
const H = await import(process.argv[2])
const SHOTS = process.argv[3]
const { banco, db, zerar, limparEstrutura, salvarEstrutura, carregarFormulario, duplicarFormulario, excluirFormulario, montarFicha, estruturaPublica, validarRespostasPublicas } = H
const BASE = 'http://localhost:3100'
globalThis.createError = (o) => Object.assign(new Error(o.message), o)

let falhas = 0
const ok = (c, nome) => { console.log(`${c ? 'PASS' : 'FAIL'} ${nome}`); if (!c) falhas++ }

// ── Banco de teste ──
zerar()
db.contatos = [{ id: 1, nome: 'Maria Souza' }]
db.casos = []; db.contato_respostas = []; db.caso_respostas = []; db.formulario_envios = []
const { id: FORM } = await salvarEstrutura(banco, null, limparEstrutura({ nome: 'Formulário sem título', contexto: 'cliente', secoes: [{ titulo: 'Seção 1', itens: [] }] }))
if (FORM !== 1) throw new Error('o formulário de teste precisa ter id 1 (página __t_construtor)')
db.formulario_envios.push({ id: 1, contato_id: 1, formulario_id: FORM, token: 'T'.repeat(40), expira_em: new Date(Date.now() + 864e5).toISOString(), status: 'enviado', respondido_em: null })

// ── API simulada ──
const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
async function api(route) {
  const req = route.request(); const url = new URL(req.url()); const path = url.pathname; const m = req.method()
  const body = () => { try { return JSON.parse(req.postData() || '{}') } catch { return {} } }
  try {
    let r
    if ((r = path.match(/^\/api\/formularios\/(\d+)$/))) {
      const id = Number(r[1])
      if (m === 'GET') return json(route, 200, await carregarFormulario(banco, id))
      if (m === 'PUT') { const x = await salvarEstrutura(banco, id, limparEstrutura(body())); return json(route, 200, { success: true, ...x.relatorio }) }
      if (m === 'DELETE') return json(route, 200, { success: true, ...(await excluirFormulario(banco, id)) })
    }
    if ((r = path.match(/^\/api\/formularios\/(\d+)\/duplicar$/)) && m === 'POST') return json(route, 200, { id: await duplicarFormulario(banco, Number(r[1])) })
    if (path === '/api/formularios' && m === 'GET') return json(route, 200, [])
    if (path === '/api/formulario-perguntas') return json(route, 200, db.formulario_perguntas ?? [])
    if ((r = path.match(/^\/api\/pre-formulario\/(\w+)$/))) {
      const envio = db.formulario_envios.find(e => e.token === r[1])
      if (!envio) return json(route, 404, { message: 'Este link não é mais válido.' })
      const est = await estruturaPublica(banco, envio.formulario_id)
      if (m === 'GET') return json(route, 200, { primeiroNome: 'Maria', advogada: 'a Dra.', respondido: !!envio.respondido_em, formulario: { nome: est.nome, descricao: est.descricao }, secoes: est.secoes })
      if (m === 'POST') {
        const b = body()
        if (b.consentimento !== true) return json(route, 400, { message: 'Confirme o aviso de privacidade.' })
        if (!b.resumo) return json(route, 400, { message: 'Conte um pouco da sua situação.' })
        const { linhas, validas } = validarRespostasPublicas(est.secoes, b.respostas && typeof b.respostas === 'object' ? b.respostas : {})
        db.formulario_envio_respostas = [...(db.formulario_envio_respostas ?? []), ...linhas.map(l => ({ ...l, envio_id: envio.id }))]
        if (est.contexto !== 'demanda') for (const [pergunta_id, resposta] of validas) {
          const ja = db.contato_respostas.find(x => x.contato_id === 1 && x.pergunta_id === pergunta_id)
          if (ja) Object.assign(ja, { resposta }); else db.contato_respostas.push({ contato_id: 1, pergunta_id, resposta, updated_at: new Date().toISOString() })
        }
        envio.respondido_em = new Date().toISOString()
        return json(route, 200, { ok: true })
      }
    }
    if ((r = path.match(/^\/api\/crm\/contatos\/1\/respostas$/)) && m === 'GET') {
      const secoes = await montarFicha(banco, 1, null)
      return json(route, 200, secoes.map(s => ({ nome: s.nome, formulario_id: s.formulario_id, mostrar_se: s.mostrar_se, perguntas: s.perguntas.map(p => ({ id: p.pergunta_id, texto: p.texto, tipo: p.tipo, opcoes: p.opcoes, ajuda: p.ajuda, obrigatoria: p.obrigatoria, arquivada: !!p.fora_do_formulario, mostrar_se: p.mostrar_se, resposta: p.resposta, respondido_em: p.respondido_em })) })))
    }
    return json(route, 200, {})
  } catch (e) { return json(route, e.statusCode ?? 500, { statusCode: e.statusCode ?? 500, message: e.message }) }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 }, serviceWorkers: 'block' })
const page = await ctx.newPage()
const erros = []
// (o script de métricas da Vercel não existe fora da hospedagem e devolve HTML: não é erro do app)
page.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) erros.push('PAGEERR ' + e.message.slice(0, 200)) })
page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) erros.push(m.text().slice(0, 200)) })
page.on('dialog', d => d.accept())
await page.route('**/api/**', api)
const T = id => page.locator(`[data-testid="${id}"]`)

async function salvar() {
  await T('salvar').click()
  await page.waitForSelector('[data-testid=mensagem]:has-text("Salvo")', { timeout: 8000 })
}
async function novaPergunta(si, texto, tipo, { obrigatoria = false, opcoes = null } = {}) {
  await T(`add-pergunta-${si}`).click()
  await T('edit-texto').fill(texto)
  if (tipo && tipo !== 'texto_curto') await T('edit-tipo').selectOption(tipo)
  if (opcoes) {
    const n = await T('opcoes').locator('[data-testid=opcao-texto]').count()
    for (let i = n; i < opcoes.length; i++) await T('opcao-adicionar').click()
    for (let i = 0; i < opcoes.length; i++) await T('opcoes').locator('[data-testid=opcao-texto]').nth(i).fill(opcoes[i])
  }
  if (obrigatoria) await T('edit-obrigatoria').check()
}
async function condicao(refTexto, valor, operador) {
  const card = page.locator('article:has([data-testid=edit-texto])') // a pergunta em edição
  await card.locator('[data-testid=logica-toggle]').click()
  await card.locator('[data-testid=cond-adicionar]').click()
  if (refTexto) await card.locator('[data-testid=cond-pergunta]').selectOption({ label: refTexto })
  if (operador) await card.locator('[data-testid=cond-operador]').selectOption(operador)
  if (valor) await card.locator('[data-testid=cond-valor]').selectOption(valor)
}

// ═══════ 1) CRIAÇÃO pelo construtor ═══════
await page.goto(`${BASE}/__t_construtor`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid=construtor]')
await T('form-titulo').fill('Dados familiares')
await T('form-descricao').fill('Informações sobre a família da cliente')
await T('secao-0').locator('[data-testid=secao-titulo]').fill('Dados pessoais')
await novaPergunta(0, 'Nome', 'texto_curto', { obrigatoria: true })
await novaPergunta(0, 'Estado civil', 'selecao_unica', { opcoes: ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União estável'] })
await T('add-secao').click()
await T('secao-1').locator('[data-testid=secao-titulo]').fill('Estrutura familiar')
await novaPergunta(1, 'Possui filhos?', 'sim_nao', { obrigatoria: true })
await novaPergunta(1, 'Quantos filhos?', 'numero')
await condicao('Possui filhos?', 'Sim')
await T('add-secao').click()
await T('secao-2').locator('[data-testid=secao-titulo]').fill('Patrimônio')
await novaPergunta(2, 'Possui patrimônio?', 'sim_nao')
await novaPergunta(2, 'Possui imóveis?', 'sim_nao')
await condicao('Possui patrimônio?', 'Sim')
// duplicar a pergunta (mantém a lógica) e renomear as cópias
await T('duplicar-pergunta').click()
await T('edit-texto').fill('Possui empresa?')
await T('duplicar-pergunta').click()
await T('edit-texto').fill('Possui investimentos?')
ok(await T('nao-salvo').isVisible(), 'alterações não salvas são sinalizadas')
await page.screenshot({ path: `${SHOTS}/f-1-construtor.png`, fullPage: true })
await salvar()
let f = await carregarFormulario(banco, FORM)
const plano = f.secoes.map(s => `${s.titulo}: ${s.itens.map(i => i.texto).join(' | ')}`)
ok(f.nome === 'Dados familiares' && f.secoes.length === 3 && f.secoes.flatMap(s => s.itens).length === 8, `criação e persistência (3 seções, 8 perguntas): ${plano.join(' // ')}`)
const pf = (t) => f.secoes.flatMap(s => s.itens).find(i => i.texto === t)
ok(pf('Quantos filhos?').mostrar_se?.regras[0].pergunta_id === pf('Possui filhos?').pergunta_id && pf('Quantos filhos?').mostrar_se.regras[0].valor === 'Sim', 'lógica configurada na tela ficou gravada (Quantos filhos? ← Possui filhos? = Sim)')
ok(['Possui imóveis?', 'Possui empresa?', 'Possui investimentos?'].every(t => pf(t).mostrar_se?.regras[0].pergunta_id === pf('Possui patrimônio?').pergunta_id), 'duplicar pergunta manteve a lógica (imóveis, empresa, investimentos ← patrimônio = Sim)')
ok(pf('Nome').obrigatoria && pf('Possui filhos?').obrigatoria && !pf('Estado civil').obrigatoria, 'obrigatoriedade gravada')
ok(pf('Estado civil').opcoes.join('|') === 'Solteiro(a)|Casado(a)|Divorciado(a)|Viúvo(a)|União estável', 'opções gravadas')

// ═══════ 2) VISUALIZAR ═══════
await T('modo-visualizar').click()
await page.waitForSelector('[data-testid=preenchimento]')
ok(await T('passo-info').innerText() === 'Etapa 1 de 3', 'prévia: 3 etapas (uma por seção)')
await T('avancar').click()
ok(await page.locator('text=Resposta obrigatória.').count() === 1, 'prévia: obrigatória vazia bloqueia o avanço')
await page.locator('[data-testid="pergunta-Nome"] input').fill('Maria')
await page.locator('[data-testid="pergunta-Estado civil"] label:has-text("Casado(a)") input').check()
await T('avancar').click()
ok(await T('passo-info').innerText() === 'Etapa 2 de 3', 'prévia: avança para a seção 2')
ok(await page.locator('[data-testid="pergunta-Quantos filhos?"]').count() === 0, 'prévia: "Quantos filhos?" escondida sem resposta')
await page.locator('[data-testid="pergunta-Possui filhos?"] label:has-text("Sim") input').check()
ok(await page.locator('[data-testid="pergunta-Quantos filhos?"]').count() === 1, 'prévia: Sim → mostra "Quantos filhos?"')
await page.locator('[data-testid="pergunta-Possui filhos?"] label:has-text("Não") input').check()
ok(await page.locator('[data-testid="pergunta-Quantos filhos?"]').count() === 0, 'prévia: Não → esconde "Quantos filhos?"')
await page.screenshot({ path: `${SHOTS}/f-2-previa.png`, fullPage: true })
await T('avancar').click()
ok(await page.locator('[data-testid="pergunta-Possui imóveis?"]').count() === 0, 'prévia: patrimônio sem resposta → sem imóveis/empresa/investimentos')
await page.locator('[data-testid="pergunta-Possui patrimônio?"] label:has-text("Sim") input').check()
ok(await page.locator('[data-testid^="pergunta-Possui"]').count() === 4, 'prévia: Sim → mostra imóveis, empresa e investimentos')
await page.locator('[data-testid="pergunta-Possui patrimônio?"] label:has-text("Não") input').check()
ok(await page.locator('[data-testid^="pergunta-Possui"]').count() === 1, 'prévia: Não → só a pergunta de patrimônio')
await T('avancar').click()
ok(await page.locator('text=Prévia concluída').count() === 1 && db.contato_respostas.length === 0, 'prévia conclui sem gravar nada')
await T('modo-editar').click()

// ═══════ 3) EDIÇÃO, REORDENAÇÃO, SEÇÕES, EXCLUSÃO ═══════
// mover com botões (sobe "Estado civil" acima de "Nome")
await page.locator('[data-testid="card-Estado civil"]').click()
await page.locator('[data-testid="card-Estado civil"] [title="Subir"]').last().click()
ok((await page.locator('[data-testid=secao-0] [data-testid^="card-"]').allInnerTexts()).length === 2, 'reordenar por botões: seção 0 continua com 2 perguntas')
let ordem0 = await page.locator('[data-testid=itens-0] [data-testid^="card-"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')))
ok(ordem0.join() === 'card-Estado civil,card-Nome', `reordenar por botões: ordem visual ${ordem0}`)
// arrastar "Nome" (alça) para depois de "Possui filhos?" na seção 2 → mover entre seções
const alvo = page.locator('[data-testid="card-Possui filhos?"]')
await page.locator('[data-testid="card-Nome"] [data-testid=alca-pergunta]').dragTo(alvo, { targetPosition: { x: 200, y: 5 } })
let ordem1 = await page.locator('[data-testid=itens-1] [data-testid^="card-"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')))
ok(ordem1.includes('card-Nome'), `arrastar: "Nome" foi movida para a seção 2 (${ordem1})`)
// desfaz movendo de volta por botões para manter a estrutura esperada
await page.locator('[data-testid="card-Nome"]').click()
for (let k = 0; k < 6; k++) { const s = await page.locator('[data-testid="card-Nome"]').evaluate(e => e.closest('[data-testid^="secao-"]').getAttribute('data-testid')); if (s === 'secao-0') break; await page.locator('[data-testid="card-Nome"] [title="Subir"]').last().click() }
// reordenar opções: DnD e botão
await page.locator('[data-testid="card-Estado civil"]').click()
await T('opcoes').locator('[title="Descer"]').first().click()
let opcoesUi = await T('opcoes').locator('[data-testid=opcao-texto]').evaluateAll(els => els.map(e => e.value))
ok(opcoesUi.slice(0, 2).join() === 'Casado(a),Solteiro(a)', 'opções: reordenar por botão')
await T('opcoes').locator('[data-testid=opcao-1] [draggable=true]').dragTo(T('opcoes').locator('[data-testid=opcao-0]'))
opcoesUi = await T('opcoes').locator('[data-testid=opcao-texto]').evaluateAll(els => els.map(e => e.value))
ok(opcoesUi.slice(0, 2).join() === 'Solteiro(a),Casado(a)', `opções: reordenar por arrastar (${opcoesUi.slice(0, 2)})`)
await T('opcoes').locator('[data-testid=opcao-excluir]').nth(4).click() // exclui "União estável"
await T('opcao-adicionar').click()
await T('opcoes').locator('[data-testid=opcao-texto]').nth(4).fill('Separado(a)')
// excluir uma pergunta com resposta futura? (ainda sem respostas) e uma seção nova duplicada
await T('secao-2').locator('[data-testid=secao-duplicar]').click()
ok(await page.locator('[data-testid^="secao-"][data-testid$="3"]').count() >= 1 && (await carregarFormulario(banco, FORM)).secoes.length === 3, 'duplicar seção cria a cópia na tela (ainda não salva)')
await T('secao-3').locator('[data-testid=secao-excluir]').click()
await T('add-secao').click()
await T('secao-3').locator('[data-testid=secao-titulo]').fill('Seção extra')
await salvar()
f = await carregarFormulario(banco, FORM)
ok(f.secoes.length === 4 && f.secoes[3].titulo === 'Seção extra', 'seção criada e persistida')
ok(f.secoes[0].itens.map(i => i.texto).join() === 'Estado civil,Nome', `ordem persistida: ${f.secoes[0].itens.map(i => i.texto)}`)
ok(f.secoes[0].itens[0].opcoes.join() === 'Solteiro(a),Casado(a),Divorciado(a),Viúvo(a),Separado(a)', `opções editadas persistidas: ${f.secoes[0].itens[0].opcoes}`)

// excluir a seção extra (vazia) e salvar
await T('secao-3').locator('[data-testid=secao-excluir]').click()
await salvar()
ok((await carregarFormulario(banco, FORM)).secoes.length === 3, 'seção excluída e persistida')

// ═══════ 4) PREENCHIMENTO PÚBLICO + persistência ═══════
const pub = await ctx.newPage()
const errosPub = []
pub.on('pageerror', e => { if (!/Unexpected token '<'/.test(e.message)) errosPub.push(e.message) })
await pub.route('**/api/**', api)
await pub.goto(`${BASE}/pc/${'T'.repeat(40)}`, { waitUntil: 'networkidle' })
await pub.waitForSelector('[data-testid=preenchimento]')
await pub.locator('#pf-resumo').fill('Quero organizar minha situação familiar.')
await pub.locator('[data-testid="pergunta-Estado civil"] label:has-text("Casado(a)") input').check()
await pub.locator('[data-testid=avancar]').click()
ok(await pub.locator('text=Resposta obrigatória.').count() === 1, 'público: obrigatória (Nome) bloqueia')
await pub.locator('[data-testid="pergunta-Nome"] input').fill('Maria Souza')
await pub.locator('[data-testid=avancar]').click()
await pub.locator('[data-testid="pergunta-Possui filhos?"] label:has-text("Sim") input').check()
await pub.locator('[data-testid="pergunta-Quantos filhos?"] input').fill('2')
await pub.locator('[data-testid=avancar]').click()
await pub.locator('[data-testid="pergunta-Possui patrimônio?"] label:has-text("Sim") input').check()
await pub.locator('[data-testid="pergunta-Possui imóveis?"] label:has-text("Sim") input').check()
await pub.locator('#pf-lgpd').check()
await pub.screenshot({ path: `${SHOTS}/f-3-publico.png`, fullPage: true })
await pub.locator('[data-testid=avancar]').click()
await pub.waitForSelector('text=Recebemos')
const resp = Object.fromEntries(db.contato_respostas.map(r => [db.formulario_perguntas.find(p => p.id === r.pergunta_id).texto, r.resposta]))
ok(resp['Nome'] === 'Maria Souza' && resp['Estado civil'] === 'Casado(a)' && resp['Quantos filhos?'] === '2' && resp['Possui imóveis?'] === 'Sim' && resp['Possui patrimônio?'] === 'Sim', `respostas gravadas na ficha do cliente: ${JSON.stringify(resp)}`)
ok(!('Possui empresa?' in resp) || resp['Possui empresa?'] == null, 'pergunta visível mas não respondida não grava nada')
ok((db.formulario_envio_respostas ?? []).some(r => r.pergunta_texto === 'Nome' && r.secao_titulo === 'Dados pessoais'), 'snapshot do envio guarda pergunta e seção')

// ═══════ 5) FICHA do cliente apresenta as respostas (sem copiar) ═══════
const fichaPg = await ctx.newPage()
await fichaPg.route('**/api/**', api)
await fichaPg.goto(`${BASE}/__t_ficha`, { waitUntil: 'networkidle' })
await fichaPg.waitForSelector('text=Maria Souza')
const textoFicha = (await fichaPg.locator('body').innerText()).toLowerCase() // (títulos de seção usam CSS uppercase)
ok(textoFicha.includes('dados pessoais') && textoFicha.includes('estrutura familiar') && textoFicha.includes('casado(a)') && textoFicha.includes('possui imóveis?'), 'ficha mostra seções do formulário e as respostas')
await fichaPg.screenshot({ path: `${SHOTS}/f-4-ficha.png`, fullPage: true })

// ═══════ 6) HISTÓRICO: desativar/remover pergunta com resposta ═══════
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid=construtor]')
await page.locator('[data-testid="card-Quantos filhos?"]').click()
await T('excluir-pergunta').click() // confirm aceito automaticamente (aviso de arquivamento)
await page.locator('[data-testid="card-Possui investimentos?"]').click()
await T('excluir-pergunta').click() // sem resposta → exclusão definitiva
await T('salvar').click()
await page.waitForSelector('[data-testid=mensagem]:has-text("arquivada")', { timeout: 8000 })
const msg = await T('mensagem').innerText()
ok(/1 pergunta\(s\) com respostas foram arquivadas/.test(msg) && /1 pergunta\(s\) sem respostas foram excluídas/.test(msg), `aviso claro ao salvar: "${msg}"`)
const quantos = db.formulario_perguntas.find(p => p.texto === 'Quantos filhos?')
ok(quantos?.arquivada === true && db.contato_respostas.some(r => r.pergunta_id === quantos.id && r.resposta === '2'), 'pergunta respondida ARQUIVADA e resposta preservada no banco')
ok(!db.formulario_perguntas.some(p => p.texto === 'Possui investimentos?'), 'pergunta sem resposta excluída de vez')
await fichaPg.reload({ waitUntil: 'networkidle' })
await fichaPg.waitForSelector('text=Maria Souza')
await fichaPg.locator('text=Fora do formulário').first().waitFor({ timeout: 5000 })
const t2 = (await fichaPg.locator('body').innerText()).toLowerCase()
ok(t2.includes('fora do formulário') && t2.includes('quantos filhos?') && t2.includes('2'), 'ficha ainda mostra a resposta antiga em "Fora do formulário"')
await fichaPg.screenshot({ path: `${SHOTS}/f-5-ficha-historico.png`, fullPage: true })

// ═══════ 7) Duplicar formulário / contexto demanda ═══════
await T('ctx-demanda').click()
await T('salvar').click()
await page.waitForSelector('[data-testid=mensagem]:has-text("já tem respostas"), [data-testid=mensagem]:has-text("contexto")', { timeout: 8000 })
ok(/já tem respostas/.test(await T('mensagem').innerText()), 'servidor recusa mudar contexto de formulário já respondido')

console.log('erros de console/página:', erros.length ? erros.join(' | ') : 'nenhum', errosPub.length ? '| público: ' + errosPub.join(' | ') : '')
ok(erros.length === 0 && errosPub.length === 0, 'sem erros de JavaScript nas telas')
await browser.close()
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTESTE DE INTERFACE: TODOS PASSARAM')
process.exit(falhas ? 1 : 0)
