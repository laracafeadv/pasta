// Barra de navegação como central de operação: grupos → módulos → abas, ações rápidas, busca, Automações ligadas ao comportamento real.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] }); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const t = id => p.locator(`[data-testid="${id}"]`); const esp = () => p.waitForTimeout(120)
const mods = ['inicio', 'agenda', 'pessoas', 'comunicacao', 'demandas', 'financeiro', 'relatorios', 'formularios', 'manual', 'config']
ok((await p.locator('[data-testid=sidebar] [data-testid^="nav-"]:not([data-testid^="nav-seta"]):not([data-testid="nav-buscar"]):not([data-testid="nav-mais"])').evaluateAll(e => e.map(x => x.dataset.testid.replace('nav-', ''))).then(l => l.filter(x => !x.includes('-')))).join() === mods.join(), 'barra: 10 módulos nos 5 grupos')
ok(await p.locator('[data-testid=sidebar] nav p').allInnerTexts().then(l => l.join('|').toLowerCase()) === 'trabalho|pessoas|serviços jurídicos|dinheiro|escritório', 'grupos: Trabalho, Pessoas, Serviços jurídicos, Dinheiro, Escritório')
ok(await t('subs-inicio').count() === 0 && await t('subs-agenda').count() === 0, 'só o módulo aberto expande (Início não tem abas; Agenda recolhida)')
await t('nav-agenda').click(); await esp(); ok(await t('subs-agenda').locator('button').count() === 4, 'Agenda abre com 4 abas: calendário, tarefas, prazos, intimações')
await t('nav-agenda-prazos').click(); await esp(); ok(await t('nav-agenda-prazos').getAttribute('aria-current') === 'page' && /Calculadora de prazos/.test(await p.locator('main').innerText()), 'submenu leva direto à aba (Prazos) e a destaca')
await t('nav-pessoas-remarketing').click().catch(() => {}); ok(await t('subs-pessoas').count() === 0, 'módulos fechados não mostram abas')
await t('nav-seta-pessoas').click(); await esp(); ok(await t('subs-pessoas').count() === 1 && await t('subs-agenda').count() === 1, 'seta expande outro módulo sem fechar o aberto')
await t('nav-pessoas-clientes').click(); await esp(); ok(/Pessoas/.test(await t('titulo-pagina').innerText()) && await t('nav-pessoas-clientes').getAttribute('aria-current') === 'page', 'Pessoas › Clientes')
/* badges */
ok(await t('nav-agenda-intimacoes').locator('span').last().innerText() === '1', 'badge de intimações a tratar')
ok(await t('nav-inicio').innerText().then(x => /\d/.test(x)), 'badge do Início (itens de hoje)')
/* persistência do estado da barra */
await p.reload(); await p.waitForSelector('[data-testid=sidebar]'); ok(await t('subs-pessoas').count() === 1, 'a barra lembra os módulos expandidos')
/* + Novo */
await t('botao-novo').click(); await esp(); ok(await t('menu-novo').locator('button').count() === 9, '“+ Novo” oferece 9 ações rápidas em 3 grupos')
await p.mouse.click(700, 500); await esp()
const casos = [['novo-novo-contato', 'Novo contato'], ['novo-nova-tarefa', 'Nova tarefa'], ['novo-novo-prazo-ou-compromisso', 'Novo compromisso'], ['novo-nova-demanda', 'Nova demanda'], ['novo-novo-honor-rio', 'Novo honorário'], ['novo-registrar-comunica-o', 'Nova comunicação']]
for (const [id, titulo] of casos) { await t('botao-novo').click(); await esp(); const alvo = p.locator(`[data-testid^="${id.slice(0, 12)}"]`).filter({ hasText: new RegExp('^' + titulo.replace('Novo compromisso', 'Novo prazo').replace('Nova comunicação', 'Registrar comunicação').replace('Novo contato', 'Novo contato'), 'i') }).first(); await alvo.click().catch(() => {}); await esp(); const ab = await p.locator('[role=dialog] h2').first().innerText().catch(() => ''); ok(new RegExp(titulo.split(' ').slice(0, 2).join(' '), 'i').test(ab) || (id.includes('comunica') && /Nova comunicação/i.test(ab)) || (id.includes('prazo') && /compromisso/i.test(ab)), 'ação rápida: ' + titulo + ' → “' + ab + '”'); await p.keyboard.press('Escape'); await esp() }
await t('botao-novo').click(); await p.locator('[data-testid^="novo-registrar-intim"]').click(); await esp(); ok(/Agenda/.test(await t('titulo-pagina').innerText()) && /Registrar intimação/.test(await p.locator('[role=dialog] h2').first().innerText()), 'ação rápida leva ao módulo e abre o formulário (intimação)'); await p.keyboard.press('Escape')
await t('botao-novo').click(); await p.locator('[data-testid^="novo-novo-formul"]').click(); await esp(); ok(/Novo formulário/.test(await p.locator('[role=dialog] h2').first().innerText()), 'ação rápida: novo formulário'); await p.keyboard.press('Escape')
await t('botao-novo').click(); await p.locator('[data-testid^="novo-nova-peti"]').click(); await esp(); ok(/Nova inicial/.test(await p.locator('[role=dialog] h2').first().innerText()), 'ação rápida: nova petição inicial'); await p.keyboard.press('Escape')
/* Ctrl+K */
await p.keyboard.press('Control+k'); await esp(); ok(await t('busca-global').count() === 1, 'Ctrl+K abre “Buscar ou pedir”'); await p.keyboard.press('Escape')
/* Mais */
await t('nav-mais').click(); await esp(); ok((await p.locator('main, aside').first().innerText()).length > 0 && await p.getByText('Exportar todos os dados').count() === 1 && await p.getByText('Link público de formulário').count() >= 1, '“Mais”: perfil, link público e exportar (admin)')
/* Automações realmente mudam o comportamento */
await p.evaluate(() => ir('config', { aba: 'automacoes' })); await esp(); ok(await t('nav-config-automacoes').getAttribute('aria-current') === 'page', 'Configurações › Automações pelo submenu')
const base = await p.evaluate(() => ({ h: hojeItens().length, rem: remarketingElegiveis().filter(x => x.pronto).length }))
await p.evaluate(() => { const c = contato(3); c.data_nascimento = '1990-' + hojeISO().slice(5) }); const aniv1 = await p.evaluate(() => hojeItens().some(i => i.tipo === 'aniversario'))
await t('auto-check-aniversarios').uncheck(); await esp(); const aniv2 = await p.evaluate(() => hojeItens().some(i => i.tipo === 'aniversario')); ok(aniv1 && !aniv2, 'Automação: aviso de aniversário liga/desliga')
await t('auto-num-antecedenciaPrazo').fill('0'); await t('auto-num-antecedenciaPrazo').blur(); await esp(); const pz0 = await p.evaluate(() => hojeItens().filter(i => i.tipo === 'prazo').length); await t('auto-num-antecedenciaPrazo').fill('15'); await t('auto-num-antecedenciaPrazo').blur(); await esp(); const pz15 = await p.evaluate(() => hojeItens().filter(i => i.tipo === 'prazo').length); ok(pz15 > pz0, `Automação: antecedência dos prazos (0 dia → ${pz0}, 15 dias → ${pz15} no Início)`)
await t('auto-num-remarketingDias').fill('180'); await t('auto-num-remarketingDias').blur(); await esp(); ok(await p.evaluate(() => remarketingElegiveis().filter(x => x.pronto).length) === 0 && base.rem > 0, 'Automação: intervalo do remarketing')
await t('auto-check-checklistAoAbrir').uncheck(); await esp(); ok(await p.evaluate(() => { const d = abrirDemanda({ contato_id: 2, titulo: 'T', area: 'Sucessões', tipo: 'judicial' }); return docsDe(2, d.id).length }) === 0, 'Automação: checklist ao abrir demanda desligado → não cria')
await t('auto-check-cadencia').uncheck(); await esp(); ok(await p.evaluate(() => { const c = contato(1); moverEtapa(c, 'qualificacao'); return c.proxima_acao }) === null, 'Automação: sem cadência, mover etapa não define próxima ação')
await t('auto-check-cadencia').check(); await esp(); ok(await p.evaluate(() => { const c = contato(1); moverEtapa(c, 'agendado', { consulta_em: new Date(Date.now() + 864e5).toISOString() }); return !!c.proxima_acao }), 'Automação religada volta ao comportamento padrão')
await t('auto-padrao').click(); await esp(); ok(await p.evaluate(() => JSON.stringify(AUTO()) === JSON.stringify(AUTO_PADRAO)), '“Voltar ao padrão” restaura as regras')
ok(await p.evaluate(() => DB.auditoria.some(a => a.acao === 'automacoes')), 'mudança de regra fica na auditoria')
/* papel equipe */
await p.evaluate(() => { CONFIG.perfil.papel = 'equipe'; render() }); await esp(); ok(await t('nav-config').count() === 0 && /Honorários/.test(await t('nav-financeiro').innerText()), 'equipe: sem Configurações; Financeiro vira Honorários'); await p.evaluate(() => { CONFIG.perfil.papel = 'admin'; render() })
/* mobile */
await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => ir('inicio')); await esp(); await t('menu-movel').click(); await esp()
ok(await t('botao-novo').count() >= 1 && await t('nav-buscar').count() >= 1 && await p.locator('nav[aria-label=Menu] [data-testid^="nav-"]:not([data-testid^="nav-seta"])').count() >= 10, 'celular: menu com Novo, Buscar e os módulos')
ok(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 1, 'celular: sem rolagem horizontal')
ok(erros.length === 0, 'sem erros: ' + erros.slice(0, 3).join(' | ')); await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'TUDO OK'); process.exit(falhas ? 1 : 0)
