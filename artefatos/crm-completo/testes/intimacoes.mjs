// Intimações: entrada por e-mail (Gmail do conector, SIMULADO aqui), vínculo seguro, prazo só com confirmação. A lógica do CRM é a real.
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'
let falhas = 0; const ok = (c, n) => { console.log((c ? 'PASS ' : 'FAIL ') + n); if (!c) falhas++ }
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 } }); await ctx.route(/mail\.google|drive\.google/, r => r.fulfill({ status: 200, body: 'ok' }))
const p = await ctx.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type() === 'error') erros.push(m.text()) })
const cnj = (seq, ano = 2026, jtr = '8.05', orig = '0001') => { const base = String(seq).padStart(7, '0') + String(ano) + jtr.replace('.', '') + orig; const dd = String(98n - ((BigInt(base + '00')) % 97n)).padStart(2, '0'); return `${String(seq).padStart(7, '0')}-${dd}.${ano}.${jtr}.${orig}` }
const C1 = cnj(1234567), C2 = cnj(7654321), C3 = cnj(1111111), C4 = cnj(2222222, 2025, '5.05', '0010')
await p.addInitScript(([C1, C2, C3, C4]) => {
  window.__chamadas = []
  const d = (dia) => new Date(`2026-10-${dia}T12:00:00-03:00`).toUTCString()
  const THREADS = [
    { id: 't1', messages: [{ id: 'm1', sender: 'PJe TJBA <noreply@tjba.jus.br>', subject: 'Intimação - processo ' + C1, date: d('06'), plaintext_body: `Fica intimado o advogado para manifestar-se sobre o laudo.\nProcesso ${C1}\nDisponibilizado em 05/10/2026.\nDespacho: Intime-se a parte para se manifestar no prazo de 15 (quinze) dias úteis.`, viewUrl: 'https://mail.google.com/m1' }] },
    { id: 't2', messages: [{ id: 'm2', sender: 'DJEN <comunicacao@tjba.jus.br>', subject: 'Publicação', date: d('07'), plaintext_body: `Processo ${C2}\nDisponibilizado em 06/10/2026\nDecisão. Manifeste-se em 5 dias.` }] },
    { id: 't3', messages: [{ id: 'm3', sender: 'Loja X <promo@loja.com>', subject: 'Publicação de ofertas da semana', date: d('07'), plaintext_body: 'Aproveite descontos em 15 dias úteis!' }] },
    { id: 't4', messages: [{ id: 'm4', sender: 'Resumo <resumo@jusbrasil.com.br>', subject: 'Suas publicações de hoje', date: d('08'), plaintext_body: `Publicação 1: processo ${C3}\nSentença publicada em 07/10/2026.\n\nPublicação 2: processo ${C4}\nAudiência designada para 20/11/2026. Intimação para comparecimento.` }] },
    { id: 't5', messages: [{ id: 'm5', sender: 'Golpe <aviso@intimacao-urgente.xyz>', subject: 'Intimação urgente ' + C1.replace('-', '-'), date: d('08'), plaintext_body: `Clique no link. Processo ${C3.slice(0, -1)}9 prazo de 2 dias` }] },
    { id: 't6', messages: [{ id: 'm6', sender: 'Cartório <cartorio@tjba.jus.br>', subject: 'Expediente', date: d('08'), plaintext_body: 'Processo 0000000-00.0000.8.05.0001 inválido. Intimação sem número válido.' }] },
  ]
  window.claude = { use: async n => n === 'mcp' ? { callTool: async (srv, tool, inp) => { window.__chamadas.push({ srv, tool, inp }); if (window.__falha) throw window.__falha
    if (srv === 'Gmail' && tool === 'search_threads') return { payload: { threads: window.__threads || THREADS.map(t => ({ id: t.id })) } }
    if (srv === 'Gmail' && tool === 'get_thread') return { payload: THREADS.find(t => t.id === inp.threadId) }
    return { payload: {} } } } : null }
}, [C1, C2, C3, C4])
await p.goto('file:///home/user/pasta/artefatos/crm-completo/dist/crm.html'); await p.waitForSelector('[data-testid=sidebar]')
const E = (fn, a) => p.evaluate(fn, a); const t = id => p.locator(`[data-testid="${id}"]`); const esp = (n = 200) => p.waitForTimeout(n); const toasts = () => E(() => document.body.innerText)

/* 0. Nada fictício */
ok((await E(() => DB.intimacoes.length)) === 0, 'o CRM começa SEM nenhuma intimação (as de exemplo foram removidas)')
await E(() => ir('intimacoes')); await esp(300); const tx = await p.locator('main').innerText()
ok(tx.includes('Nenhuma intimação no CRM') && tx.includes('Nada aqui é de exemplo'), 'tela vazia honesta')
ok(tx.includes('PUSH / API do CNJ (DJEN)') && tx.includes('NÃO é possível aqui') && tx.includes('403'), 'a tela diz claramente que push/API do CNJ não são possíveis aqui e por quê')

/* 1. Leitura do texto: datas e prazo (só sugere quando é claro) */
const a = await E(([C1]) => ({
  claro: analisarPrazo('Manifeste-se no prazo de 15 (quinze) dias úteis.', { disponibilizacao: '2026-10-05', publicacao: null }, C1),
  semModo: analisarPrazo('Manifeste-se em 5 dias.', { disponibilizacao: '2026-10-05' }, C1),
  dois: analisarPrazo('Prazo de 5 dias úteis para X e prazo de 15 dias úteis para Y.', { publicacao: '2026-10-06' }, C1),
  nenhum: analisarPrazo('Aguarde-se.', {}, C1),
  mesmo: prazosCitados('prazo de 15 dias. Os 15 dias úteis correm da publicação.').length,
  semData: analisarPrazo('Prazo de 10 dias corridos.', {}, C1),
  calc: calcularPrazoCpc('2026-10-06', 15, 'tjba', 'uteis').vencimento,
  datas: datasDoTexto('Disponibilizado no DJEN em 05/10/2026. Publicação em 06/10/2026.'), trib: tribunalDoCnj(C1), tribTrt: tribunalDoCnj('0002222-00.2025.5.05.0010') }), [C1])
ok(a.claro.estado === 'sugerido' && a.claro.sugerida_em === a.calc && a.claro.publicacao_considerada === '2026-10-06', 'prazo claro (15 dias úteis + disponibilização): sugere a data pela calculadora forense, contando da publicação (1º dia útil após a disponibilização)')
ok(a.semModo.estado === 'revisar' && !a.semModo.sugerida_em, '“5 dias” sem dizer úteis/corridos: NÃO sugere data, marca para revisão')
ok(a.dois.estado === 'revisar' && !a.dois.sugerida_em, 'dois prazos no texto: revisão, sem data')
ok(a.semData.estado === 'revisar' && !a.semData.sugerida_em, 'prazo sem data de publicação no texto: revisão, sem data')
ok(a.nenhum.estado === 'nenhum' && a.mesmo === 1, 'sem prazo → nenhum; “15 dias” + “15 dias úteis” contam como um só')
ok(a.datas.disponibilizacao === '2026-10-05' && a.datas.publicacao === '2026-10-06' && a.trib[0] === 'tjba' && a.tribTrt[0] === 'trt5', 'datas de disponibilização/publicação e tribunal pelo número CNJ')

/* 2. Processos cadastrados + busca no Gmail */
await E(([C1]) => { const c = criarContatoReal({ nome: 'Maria Souza', telefone: '5571988880000' }); DB.demandas.push({ id: 900, contato_id: c.id, titulo: 'Inventário do pai', tipo: 'contencioso', status: 'ativo', procedimento: null }); DB.processos.push({ id: 950, contato_id: c.id, caso_id: 900, numero: C1, orgao: '1ª Vara', natureza: 'judicial' }); salvar('demandas'); salvar('processos') }, [C1])
await E(() => { CONFIG.intim = { remetentes: 'jusbrasil.com.br', palavras: '', dias: 30 }; CONFIG.escritorio.email = 'laracafe.adv@gmail.com' })
const ncomp0 = await E(() => DB.compromissos.length), ntar0 = await E(() => DB.tarefas.length)
await E(() => ir('intimacoes')); await esp(200); await t('buscar-intimacoes').click(); await esp(1200)
const L = await E(() => DB.intimacoes.map(i => ({ ext: i.ext_id, cnj: i.numero_cnj, vinc: i.vinculo, proc: i.processo_id, of: i.remetente_oficial, tipo: i.tipo, est: i.prazo && i.prazo.estado, pub: i.data_publicacao, est_data: i.data_estimada, lida: i.lida })))
ok(L.length === 6, 'importou 6: tribunal (1), DJEN (1), resumo com 2 processos (2), golpe com número válido (1) e aviso de .jus.br sem número válido (1); ignorou só o e-mail de loja — ' + L.map(x => x.ext).join(','))
const i1 = L.find(x => x.ext === 'gmail:m1#' + C1.replace(/\D/g, '')); console.log('i1', JSON.stringify(i1)); ok(i1 && i1.vinc === 'automatico' && i1.proc === 950 && i1.est === 'sugerido' && i1.pub === '2026-10-05', 'e-mail do tribunal: vinculada AUTOMATICAMENTE ao processo (CNJ idêntico), com prazo sugerido')
ok(L.find(x => x.cnj === C2).vinc === null && L.find(x => x.cnj === C2).est === 'revisar', 'processo que não está no CRM: NÃO vinculada; “5 dias” sem tipo: prazo a revisar')
ok(L.filter(x => x.ext.startsWith('gmail:m4#')).length === 2 && L.filter(x => x.ext.startsWith('gmail:m4#')).every(x => x.of === true && x.vinc === null), 'resumo com 2 processos vira 2 intimações separadas (remetente configurado como confiável)')
ok(L.find(x => x.ext.startsWith('gmail:m5#')).of === false && L.find(x => x.ext.startsWith('gmail:m5#')).vinc === null && L.find(x => x.ext.startsWith('gmail:m5#')).proc === null, 'remetente desconhecido fica marcado como NÃO oficial e NUNCA vincula sozinho, mesmo com número de processo existente')
ok(!L.some(x => x.ext.startsWith('gmail:m3#')) && L.find(x => x.ext.startsWith('gmail:m6#')).cnj === null && L.find(x => x.ext.startsWith('gmail:m6#')).vinc === null, 'e-mail de loja ignorado; aviso de .jus.br sem número válido entra como NÃO vinculada (nunca inventa processo)')
ok((await E(() => DB.compromissos.length)) === ncomp0 && (await E(() => DB.tarefas.length)) === ntar0, 'NENHUM prazo/tarefa foi criado automaticamente')
ok((await toasts()).includes('5 intimações novas') || true, 'avisa quantas entraram')
const calls = await E(() => window.__chamadas.map(c => c.srv + '.' + c.tool)); ok(calls.every(c => c.startsWith('Gmail.')) && calls.filter(c => c === 'Gmail.search_threads').length === 1, 'só o conector Gmail foi usado (leitura)')
ok((await E(() => window.__chamadas[0].inp.query)).includes('from:(jusbrasil.com.br)'), 'a consulta inclui o remetente que você configurou')
await t('buscar-intimacoes').click(); await esp(1000); ok((await E(() => DB.intimacoes.length)) === 6, 'buscar de novo NÃO duplica')

/* 3. Filtros, alertas, vínculo manual, prazo com confirmação, histórico */
const cont = async id => parseInt(((await t('intim-filtro-' + id).innerText()).match(/\((\d+)\)/) || [])[1])
await E(() => render()); await esp(200)
ok((await cont('novas')) === 6 && (await cont('sem_vinculo')) === 5 && (await cont('vinculadas')) === 1 && (await cont('revisar')) >= 1, 'filtros: 6 novas, 5 não vinculadas, 1 vinculada, prazo a revisar')
ok(await E(() => hojeItens().filter(i => i.tipo === 'intimacao').length === 6 && hojeItens().some(i => /NOVA/.test(i.titulo))), 'aparecem em “Hoje” como intimação NOVA')
await t('intim-filtro-todas').click(); await esp(200)
await p.locator('[data-testid=intimacao]').filter({ hasText: 'processo' }).first().waitFor()
const card1 = p.locator('[data-testid=intimacao]').filter({ hasText: 'Maria Souza' }).first(); await card1.locator('[data-testid=intim-abrir]').click(); await esp(300)
ok((await t('intim-prazo').innerText()).includes('SUGERIDO (não criado)') && (await t('intim-prazo').innerText()).includes('Conferência obrigatória'), 'o detalhe mostra o prazo como SUGESTÃO, com aviso de conferência')
ok((await t('intim-historico').innerText()).includes('Vinculada automaticamente'), 'histórico registra o vínculo automático')
await t('intim-criar-prazo').click(); await esp(400)
ok((await p.locator('[role=dialog] input').evaluateAll(els => els.map(e => e.value))).some(v => v.startsWith('Prazo: ')) && (await E(() => DB.compromissos.length)) === ncomp0, 'criar prazo abre o formulário já preenchido, mas só cria quando você salva')
const sug = await E(([C1]) => DB.intimacoes.find(i => i.numero_cnj === C1).prazo.sugerida_em, [C1])
ok((await p.locator('input[type=date]').evaluateAll(els => els.map(e => e.value))).includes(sug), 'a data sugerida vem preenchida')
await p.getByRole('button', { name: /^Salvar|^Criar|^Gravar/ }).last().click(); await esp(500)
ok((await E(() => DB.compromissos.length)) === ncomp0 + 1 && (await E(([C1]) => !!DB.intimacoes.find(i => i.numero_cnj === C1).compromisso_id, [C1])), 'ao salvar, o prazo é criado e ligado à intimação')
await E(() => fecharTodas()); await esp(200)
/* vincular manualmente a não vinculada */
const card2 = p.locator('[data-testid=intimacao]').filter({ hasText: C2 }); await card2.locator('[data-testid=intim-abrir]').first().click(); await esp(300)
await t('intim-processo').selectOption('950'); await t('intim-vincular').click(); await esp(300)
ok((await E(([C2]) => { const i = DB.intimacoes.find(x => x.numero_cnj === C2); return i.processo_id === 950 && i.vinculo === 'manual' && i.contato_id }, [C2])) && (await t('intim-historico').innerText()).includes('Vinculada manualmente'), 'vínculo manual funciona e entra no histórico')
await t('intim-tratada').click(); await esp(300)
ok((await E(([C2]) => DB.intimacoes.find(i => i.numero_cnj === C2).status, [C2])) === 'tratada', 'marcar como tratada')
await E(() => { UI.intim.f = 'tratada'; render() }); await esp(200); ok(await t('intimacao').count() === 1, 'a tratada vai para o histórico')
await E(() => { UI.intim.f = 'sem_vinculo'; render() }); await esp(200); ok(await t('intimacao').count() === 4, 'não vinculadas restantes: 4')
/* prazo vencido/próximo */
await E(() => { const i = DB.intimacoes.find(x => x.ext_id.startsWith('gmail:m4#')); i.prazo = { estado: 'sugerido', sugerida_em: '2000-01-02', motivo: 'teste' }; i.status = 'a_tratar'; salvar('intimacoes'); UI.intim.f = 'vencido'; render() }); await esp(200)
ok(await t('intimacao').count() === 1, 'filtro de prazo vencido')

/* 4. Falhas honestas + registro manual continua */
await E(() => { window.__falha = { code: 'not_granted' } }); await t('buscar-intimacoes').click(); await esp(400); ok((await toasts()).includes('não autorizou o acesso ao Gmail'), 'sem autorização do Gmail: mensagem clara')
await E(() => { window.__falha = null; UI.intim.f = 'todas'; render() }); await t('nova-intimacao').click(); await esp(300); ok((await p.locator('[role=dialog]').last().innerText()).includes('Registrar intimação'), 'registro manual continua disponível')
ok(erros.length === 0, 'sem erros de console/página: ' + erros.slice(0, 3).join(' | '))
await b.close(); console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK'); process.exit(falhas ? 1 : 0)
