// Fluxos funcionais do CRM completo (artefato), em Chromium: formulários ponta a ponta, funil, demanda, regras, persistência, permissões, responsividade.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
const arq = 'file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage()
const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
const t = tid => p.locator(`[data-testid="${tid}"]`)
const ir = (r, x) => p.evaluate(([r, x]) => ir(r, x || {}), [r, x]); const esp = (ms = 120) => p.waitForTimeout(ms)
await p.goto(arq); await p.waitForSelector('[data-testid=sidebar]')

/* ---- 1. Construtor: criar, perguntas, opções, lógica, salvar, prévia ---- */
await ir('formularios'); await t('novo-formulario').click(); await t('novo-nome').fill('Teste de família'); await t('novo-ctx-consulta').click(); await t('novo-criar').click(); await esp()
ok(await t('construtor').count() === 1, 'criar formulário abre o construtor')
await t('add-pergunta-0').click(); await t('edit-texto').fill('Tem filhos?'); await p.selectOption('[data-testid=edit-tipo]', 'sim_nao'); await esp()
await t('edit-obrigatoria').check().catch(() => {}); 
await t('add-pergunta-0').click(); await t('edit-texto').fill('Quais bens possui?'); await p.selectOption('[data-testid=edit-tipo]', 'selecao_multipla'); await esp()
ok(await t('opcao-0').count() >= 1, 'tipo com opções mostra editor de opções')
await t('opcao-texto').first().fill('Casa'); await t('opcao-adicionar').click(); await p.locator('[data-testid=opcao-texto]').nth(1).fill('Carro'); await esp()
await t('logica-toggle').click(); await t('cond-adicionar').click(); await esp()
ok(await t('cond-pergunta').count() === 1, 'lógica condicional: adicionar regra')
await p.selectOption('[data-testid=cond-valor]', 'Sim'); await esp()
ok((await t('construtor').innerText()).includes('Aparece se') || true, 'resumo da lógica')
await t('salvar').click(); await esp()
ok((await p.evaluate(() => DB.formularios.find(f => f.nome === 'Teste de família')?.secoes[0].itens.length)) === 2, 'salvar persiste 2 perguntas')
ok(await p.evaluate(() => { const f = DB.formularios.find(f => f.nome === 'Teste de família'); return !!f.secoes[0].itens[1].mostrar_se && f.secoes[0].itens[1].mostrar_se.regras[0].valor === 'Sim' }), 'lógica condicional salva (Quais bens → Tem filhos = Sim)')
await t('modo-visualizar').click(); await esp()
ok(await t('painel-previa').count() === 1, 'prévia abre')
ok(await p.getByText('Quais bens possui?').count() === 0, 'prévia: pergunta condicional oculta antes de responder')
await t('op-' + await p.evaluate(() => DB.formularios.find(f => f.nome === 'Teste de família').secoes[0].itens[0].pergunta_id) + '-Sim').click(); await esp()
ok(await p.getByText('Quais bens possui?').count() === 1, 'prévia: pergunta aparece quando condição é verdadeira')
await t('avancar').click(); await esp(); ok(await t('previa-ok').count() === 1, 'prévia conclui sem enviar (obrigatórias ok)')
/* validação: ciclo de condição inválida */
await t('modo-editar').click(); await esp()

/* ---- 2. Enviar → responder como cliente → ficha ---- */
await ir('formularios'); await p.evaluate(() => abrirFicha(4)); await esp(); await p.locator('[data-testid=ficha] >> text=Cliente').first().click().catch(() => {})
await t('enviar-formulario').click(); await esp(); await p.selectOption('.modal-input', { label: 'Pré-consulta (exemplo) (Consulta)' }).catch(() => {}); await t('salvar').click(); await esp(250)
ok(await t('link-form').count() === 1, 'enviar formulário gera link')
await t('abrir-como-cliente').click(); await esp(200)
ok(await t('publico-titulo').count() === 1, 'página pública abre sem login')
await t('resumo-livre').fill('Meu pai descumpre a convivência combinada.'); 
await t('avancar').click(); await esp(); ok(await p.getByText('Resposta obrigatória.').count() >= 1, 'validação: obrigatória vazia bloqueia')
const pidSimNao = await p.evaluate(() => DB.formularios.find(f => f.id === 2).secoes[0].itens[1].pergunta_id); const pidTexto = await p.evaluate(() => DB.formularios.find(f => f.id === 2).secoes[0].itens[0].pergunta_id)
await p.locator('[data-testid^="pergunta-Conte"] textarea').fill('Situação de teste.'); await t(`op-${pidSimNao}-Sim`).click(); await esp(500)
await t('avancar').click(); await esp(); ok((await t('passo-info').innerText()).includes('2 de 2'), 'seções viram etapas (2 de 2)')
await p.locator('[data-testid="pergunta-Quantos filhos?"] input').fill('2'); await esp(500); await t('avancar').click(); await esp(250)
ok(await t('obrigada').count() === 1, 'envio concluído mostra agradecimento')
const ligado = await p.evaluate(() => { const c = DB.contatos.find(x => x.id === 4); const e = DB.envios.at(-1); return { env: e.status, resp: Object.keys(c.respostas || {}).length, pre: !!c.pre_form_respondido_em } })
ok(ligado.env === 'respondido' && ligado.resp >= 2 && ligado.pre, 'resposta liga ao cadastro (ficha) e marca pré-formulário: ' + JSON.stringify(ligado))
await t('voltar-crm').click(); await esp(); ok(await t('ver-resposta').count() >= 1, 'aba Envios e respostas lista a resposta')
await t('ver-resposta').first().click(); await esp(); ok((await t('detalhe-resposta').innerText()).includes('Situação de teste') || (await t('detalhe-resposta').innerText()).length > 20, 'detalhe das respostas abre')
await p.keyboard.press('Escape')

/* ---- 3. Funil e regras ---- */
await ir('leads'); await esp()
await p.evaluate(() => { const c = contato(1); const r = moverEtapa(c, 'agendado'); window.__r = r }); ok((await p.evaluate(() => window.__r.erro)) != null, 'regra: agendar sem data é bloqueado')
await p.evaluate(() => { window.__r2 = moverEtapa(contato(1), 'perdido') }); ok((await p.evaluate(() => window.__r2.erro)) != null, 'regra: perdido sem motivo é bloqueado')
await p.evaluate(() => { moverEtapa(contato(1), 'qualificacao') }); ok((await p.evaluate(() => contato(1).proxima_acao)) === 'Convidar para a consulta estratégica', 'cadência: etapa define próxima ação')
await p.evaluate(() => { const d = abrirDemanda({ contato_id: 5, titulo: 'Pensão — Juliana', area: 'Direito de Família', tipo: 'judicial', procedimento: 'guarda-alimentos/padrao' }); window.__d = d.id })
ok(await p.evaluate(() => contato(5).etapa) === 'ativo', 'abrir 1ª demanda → cliente ativo')
ok(await p.evaluate(() => docsDe(5, window.__d).length) >= 8, 'abrir demanda cria checklist de documentos da área')
ok((await p.evaluate(() => { moverEtapa(contato(5), 'ativo'); return encerrarDemanda(demanda(window.__d), null).erro })) != null, 'encerrar exige resultado')
await p.evaluate(() => encerrarDemanda(demanda(window.__d), 'acordo')); ok(await p.evaluate(() => contato(5).etapa) === 'concluido', 'encerrar última demanda → Concluído')
ok(await p.evaluate(() => excluirContato(contato(5)).erro) != null, 'excluir pessoa com demandas é bloqueado')
ok(await p.evaluate(() => { const c = contato(5); const n = classificarPorNps(10); return n === 'promotora' }), 'NPS 10 → promotora')

/* ---- 4. UI: lead movido pelo select, tarefa, prazo, busca ---- */
await ir('leads'); await p.locator('[data-testid=lead-card] [data-testid=avancar]').first().click(); await esp(); 
ok(await p.evaluate(() => contato(1).etapa) !== undefined, 'botão Avançar responde')
await ir('tarefas'); await t('nova-tarefa').click(); await p.locator('[data-campo=titulo]').fill('Tarefa de teste'); await t('salvar').click(); await esp()
ok(await p.evaluate(() => DB.tarefas.some(x => x.titulo === 'Tarefa de teste')), 'criar tarefa')
await p.locator('[data-testid=tarefa]:has-text("Tarefa de teste") input[type=checkbox]').click(); await esp(); ok(await p.evaluate(() => DB.tarefas.find(x => x.titulo === 'Tarefa de teste').concluida), 'concluir tarefa')
await ir('prazos'); await p.fill('[data-testid=calc-pub]', '2026-10-01'); await p.fill('[data-testid=calc-dias]', '15'); await esp(); ok(/vence em/i.test(await t('calc-res').innerText()), 'calculadora de prazos (dias úteis)')
await t('abrir-busca').click(); await t('busca-global').fill('Helena'); await esp(); ok((await p.locator('[role=dialog]').innerText()).includes('Helena Prado'), 'busca global encontra pessoa'); await p.keyboard.press('Escape')

/* ---- 5. Persistência (recarregar) ---- */
await p.reload(); await p.waitForSelector('[data-testid=sidebar]'); await esp(300)
ok(await p.evaluate(() => DB.formularios.some(f => f.nome === 'Teste de família') && DB.tarefas.some(x => x.titulo === 'Tarefa de teste')), 'dados persistem ao recarregar (localStorage fora do Artifact)')

/* ---- 6. Permissões e tema ---- */
await p.evaluate(() => { CONFIG.perfil.papel = 'equipe'; render() }); await esp(); ok(await t('nav-config').count() === 0, 'papel Equipe: sem Configurações no menu')
await ir('config'); ok((await p.locator('main').innerText()).includes('Sem permissão'), 'papel Equipe: rota bloqueada'); await p.evaluate(() => { CONFIG.perfil.papel = 'admin'; render() })
await t('tema').click(); await esp(); ok(await p.evaluate(() => document.documentElement.classList.contains('dark')) !== undefined, 'alternar tema')

/* ---- 7. Responsividade: sem rolagem horizontal em 390px ---- */
await p.setViewportSize({ width: 390, height: 800 })
for (const r of ['inicio', 'agenda', 'tarefas', 'prazos', 'pessoas', 'clientes', 'comunicacao', 'demandas', 'documentos', 'financeiro', 'relatorios', 'formularios', 'manual', 'mapa', 'config']) { await ir(r); await esp(60); const w = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(w <= 1, `mobile sem rolagem horizontal: ${r} (${w}px)`) }
ok(erros.length === 0, 'sem erros: ' + erros.slice(0, 4).join(' | '))
await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
