'use strict'
/* ============ Casca: roteador, barra lateral, cabeçalho, busca, notificações, login ============ */
const VIEWS = {}            // rota -> (params) => elemento
/* ---------- navegação: grupos → módulos → abas (submenu) ----------
   Cada módulo é uma tela completa com abas; a barra mostra os módulos e, no módulo aberto (ou nos que você expandir), as abas como atalhos diretos. */
const abaDe = { agenda: () => UI.ag.aba, pessoas: () => UI.pes.aba, comunicacao: () => UI.comAbas.aba, demandas: () => UI.dm.aba, financeiro: () => UI.fin.aba, relatorios: () => UI.rel.aba, formularios: () => UI.form.aba, manual: () => UI.man.aba, config: () => UI.cfg.aba }
function contadores() {
  const h0 = hojeISO()
  return { tarefasAtrasadas: DB.tarefas.filter(t => !t.concluida && t.prazo < h0).length, prazos7: DB.compromissos.filter(p => p.status === 'pendente' && p.tipo === 'prazo' && diaDe(dataDoCompromisso(p)) <= hojeISO(7)).length, intimacoes: DB.intimacoes.filter(i => i.status === 'a_tratar').length, leadsNovos: DB.contatos.filter(c => c.etapa === 'novo').length, remarketing: remarketingElegiveis().filter(x => x.pronto).length, naoLidas: DB.comunicacoes.filter(m => m.direcao === 'entrada' && !m.lida).length, docsPend: DB.demandas.filter(x => x.status === 'ativo' && x.tipo !== 'consultivo' && docsResumo(x.contato_id, x.id).pend).length, iniciais: CRM.INI.seloIniciais(DB.iniciais, h0), contasVencidas: DB.lancamentos.filter(l => !l.pago_em && l.vencimento < h0).length }
}
const MODULOS = () => {
  const n = contadores(); const adm = CONFIG.perfil.papel === 'admin'
  return [
    { grupo: 'Trabalho', itens: [
      { id: 'inicio', rotulo: 'Início', icone: 'ph:sun-bold', badge: pendenciasHoje() },
      { id: 'agenda', rotulo: 'Agenda', icone: 'ph:calendar-bold', subs: [['calendario', 'Calendário', 'ph:calendar-blank-bold'], ['tarefas', 'Tarefas', 'ph:check-square-bold', n.tarefasAtrasadas], ['prazos', 'Prazos', 'ph:hourglass-high-bold', n.prazos7], ['intimacoes', 'Intimações', 'ph:megaphone-bold', n.intimacoes]] }] },
    { grupo: 'Pessoas', itens: [
      { id: 'pessoas', rotulo: 'Pessoas', icone: 'ph:users-bold', subs: [['funil', 'Funil de leads', 'ph:kanban-bold', n.leadsNovos], ['clientes', 'Clientes', 'ph:user-check-bold'], ['remarketing', 'Remarketing', 'ph:arrow-counter-clockwise-bold', n.remarketing]] },
      { id: 'comunicacao', rotulo: 'Comunicação', icone: 'ph:chats-circle-bold', subs: [['caixa', 'Caixa de entrada', 'ph:tray-bold', n.naoLidas], ['modelos', 'Modelos de mensagem', 'ph:chat-circle-text-bold']] }] },
    { grupo: 'Serviços jurídicos', itens: [
      { id: 'demandas', rotulo: 'Demandas', icone: 'ph:briefcase-bold', subs: [['demandas', 'Demandas', 'ph:briefcase-bold'], ['processos', 'Processos', 'ph:gavel-bold'], ['documentos', 'Documentos', 'ph:files-bold', n.docsPend], ['iniciais', 'Petições iniciais', 'ph:file-text-bold', n.iniciais]] }] },
    { grupo: 'Dinheiro', itens: [
      { id: 'financeiro', rotulo: adm ? 'Financeiro' : 'Honorários', icone: 'ph:wallet-bold', subs: [['honorarios', 'Honorários', 'ph:handshake-bold'], ['contas', 'Contas a pagar e receber', 'ph:receipt-bold', n.contasVencidas]] },
      { id: 'relatorios', rotulo: 'Relatórios', icone: 'ph:chart-bar-bold', subs: [['visao', 'Visão geral', 'ph:chart-pie-bold'], ['funil', 'Funil e carteira', 'ph:funnel-bold'], ['qualidade', 'Qualidade', 'ph:shield-check-bold']] }] },
    { grupo: 'Escritório', itens: [
      { id: 'formularios', rotulo: 'Formulários', icone: 'ph:clipboard-text-bold', subs: [['formularios', 'Meus formulários', 'ph:clipboard-text-bold'], ['respostas', 'Envios e respostas', 'ph:chat-centered-text-bold', formulariosARever()]] },
      { id: 'manual', rotulo: 'Padrões operacionais', icone: 'ph:list-checks-bold', subs: [['padroes', 'Passo a passo', 'ph:list-checks-bold'], ['fluxo', 'Fluxo do CRM', 'ph:flow-arrow-bold']] },
      ...(adm ? [{ id: 'config', rotulo: 'Configurações', icone: 'ph:gear-bold', subs: [['escritorio', 'Escritório e dados', 'ph:buildings-bold'], ['automacoes', 'Automações', 'ph:lightning-bold'], ['conexoes', 'Conexões e IA', 'ph:plugs-connected-bold'], ['auditoria', 'Auditoria', 'ph:shield-check-bold']] }] : [])] },
  ]
}
const NAVST = lsGet('nav', {})      // módulo → expandido? (escolha da usuária; sem escolha, só o módulo aberto fica expandido)
const salvarNav = () => lsSet('nav', NAVST)
const expandido = (m, ativo) => (NAVST[m.id] !== undefined ? NAVST[m.id] : ativo)
const somaBadges = m => (m.subs || []).reduce((s, x) => s + (x[3] || 0), 0)
/** Rotas antigas continuam valendo: apontam para a aba certa do módulo que as absorveu. */
const ALIAS = { dashboard: ['inicio', {}], hoje: ['inicio', {}], secretaria: ['inicio', {}], tarefas: ['agenda', { aba: 'tarefas' }], prazos: ['agenda', { aba: 'prazos' }], intimacoes: ['agenda', { aba: 'intimacoes' }], leads: ['pessoas', { aba: 'funil' }], clientes: ['pessoas', { aba: 'clientes' }], remarketing: ['pessoas', { aba: 'remarketing' }], mensagens: ['comunicacao', { aba: 'modelos' }], processos: ['demandas', { aba: 'processos' }], documentos: ['demandas', { aba: 'documentos' }], mapa: ['manual', { aba: 'fluxo' }], auditoria: ['config', { aba: 'auditoria' }] }
const ROTAS_ROTULO = { perfil: 'Meu perfil' }
const R = { rota: 'inicio', p: {} }
let menuMovel = false

let CONSTR = null
const abaSet = { agenda: v => { UI.ag.aba = v }, pessoas: v => { UI.pes.aba = v }, comunicacao: v => { UI.comAbas.aba = v }, demandas: v => { UI.dm.aba = v }, financeiro: v => { UI.fin.aba = v }, relatorios: v => { UI.rel.aba = v }, formularios: v => { UI.form.aba = v }, manual: v => { UI.man.aba = v }, config: v => { UI.cfg.aba = v } }
function ir(rota, p = {}) { if (ALIAS[rota]) { const [r2, p2] = ALIAS[rota]; rota = r2; p = { ...p2, ...p } } if (p.aba && abaSet[rota]) abaSet[rota](p.aba); fecharTodas(); REDES.clear(); if (!(rota === 'formularios' && p.editar)) CONSTR = null; R.rota = rota; R.p = p; menuMovel = false; try { history.replaceState(null, '', '#' + rota) } catch (e) { /* sem histórico */ } render(); window.scrollTo(0, 0) }
function lerHash() { const r = (location.hash || '').replace('#', ''); return VIEWS[r] ? r : ALIAS[r] ? ALIAS[r][0] : null }

function guardarFoco() { const a = document.activeElement; if (!a || !a.getAttribute) return null; const k = a.getAttribute('data-testid') || a.getAttribute('data-campo'); if (!k || !/^(INPUT|TEXTAREA)$/.test(a.tagName) || a.closest('[role=dialog]')) return null; return { k, attr: a.getAttribute('data-testid') ? 'data-testid' : 'data-campo', ini: a.selectionStart, fim: a.selectionEnd } }
function restaurarFoco(f) { if (!f) return; const el = document.querySelector(`[${f.attr}="${f.k}"]`); if (el) { el.focus(); try { el.setSelectionRange(f.ini, f.fim) } catch (e) { /* tipo sem seleção */ } } }

function render() {
  const foco = guardarFoco(); const y = window.scrollY; const raiz = $('app')
  const dentro = R.rota === 'publico' ? FormulariosPublico() : casca()
  raiz.replaceChildren(dentro); window.scrollTo(0, y); restaurarFoco(foco); document.title = 'CRM Lara Café'
}

const pilula = (n, cls = '') => n ? h('span', { class: 'min-w-[17px] h-[17px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center shrink-0 ' + cls }, n) : null
function linhaModulo(m, movel) {
  const ativo = R.rota === m.id; const aberto = m.subs && expandido(m, ativo); const base = movel ? 'rounded-full text-xs font-semibold uppercase tracking-[0.14em] px-4 py-2.5 ' : 'rounded-xl text-[13px] font-semibold px-2.5 py-2 '
  const cor = ativo ? (movel ? 'bg-cafe-creme text-cafe' : 'bg-white/10 text-white') : (movel ? 'text-cafe-creme/80' : 'text-cafe-creme/80 hover:bg-white/5 hover:text-white')
  const ir_ = () => { if (m.subs) { NAVST[m.id] = true; salvarNav() } ir(m.id) }
  const principal = h('button', { type: 'button', class: `flex-1 min-w-0 flex items-center gap-2.5 text-left transition-colors ${base} ${cor}`, onclick: ir_, 'aria-current': ativo && !m.subs ? 'page' : null, 'data-testid': 'nav-' + m.id }, ic(m.icone, 'text-base shrink-0'), h('span', { class: 'truncate' }, m.rotulo), h('span', { class: 'ml-auto flex items-center' }, !aberto ? pilula(m.subs ? somaBadges(m) : m.badge) : (m.id === 'inicio' ? pilula(m.badge) : null)))
  const seta = m.subs ? h('button', { type: 'button', class: 'w-7 h-7 shrink-0 rounded-lg text-cafe-creme/50 hover:text-white hover:bg-white/5 inline-flex items-center justify-center', 'aria-label': (aberto ? 'Recolher ' : 'Expandir ') + m.rotulo, 'aria-expanded': aberto ? 'true' : 'false', onclick: ev => { ev.stopPropagation(); NAVST[m.id] = !aberto; salvarNav(); render() }, 'data-testid': 'nav-seta-' + m.id }, ic(aberto ? 'ph:caret-down-bold' : 'ph:caret-right-bold', 'text-xs')) : null
  const subs = aberto ? h('div', { class: 'ml-[18px] pl-2.5 border-l border-white/10 space-y-0.5 mb-1', 'data-testid': 'subs-' + m.id }, m.subs.map(([aba, rot, icone, nb]) => { const sa = ativo && abaDe[m.id]() === aba; return h('button', { type: 'button', class: 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium text-left transition-colors ' + (sa ? 'bg-white/10 text-white' : 'text-cafe-creme/70 hover:bg-white/5 hover:text-white'), 'aria-current': sa ? 'page' : null, onclick: () => ir(m.id, { aba }), 'data-testid': `nav-${m.id}-${aba}` }, ic(icone, 'text-[13px] shrink-0 opacity-80'), h('span', { class: 'truncate' }, rot), h('span', { class: 'ml-auto' }, pilula(nb, '!bg-danger/80'))) })) : null
  return h('div', {}, h('div', { class: 'flex items-center gap-0.5' }, principal, seta), subs)
}
/** Ações rápidas: criar sem passar pelo módulo. */
function novaComunicacaoRapida() { modalForm('Nova comunicação', [{ chave: 'contato_id', rotulo: 'Pessoa', tipo: 'select', opcoes: DB.contatos.filter(c => c.etapa !== 'relacionado').map(c => [c.id, c.nome]), numerico: true, obrigatorio: true }], {}, v => { setTimeout(() => abrirComunicacao(v.contato_id), 30) }, { rotulo: 'Abrir conversa' }) }
const ACOES_NOVO = () => [
  ['Atendimento', [['Novo contato', 'ph:user-plus-bold', () => editarContato(null)], ['Registrar comunicação', 'ph:chats-circle-bold', novaComunicacaoRapida], ['Novo formulário', 'ph:clipboard-text-bold', () => { ir('formularios', { aba: 'formularios' }); setTimeout(novoFormulario, 40) }]]],
  ['Trabalho', [['Nova tarefa', 'ph:check-square-bold', () => editarTarefa(null)], ['Novo prazo ou compromisso', 'ph:hourglass-high-bold', () => editarCompromisso(null, { tipo: 'prazo' })], ['Registrar intimação', 'ph:megaphone-bold', () => { ir('agenda', { aba: 'intimacoes' }); setTimeout(() => formIntimacao(null), 40) }]]],
  ['Serviços e dinheiro', [['Nova demanda', 'ph:briefcase-bold', () => abrirDemandaForm(null)], ['Nova petição inicial', 'ph:file-text-bold', () => { ir('demandas', { aba: 'iniciais' }); setTimeout(() => formInicial(null), 40) }], ['Novo honorário', 'ph:handshake-bold', () => editarHonorario(null)]]],
]
function botaoNovo(movel) {
  const caixa = h('div', { class: 'hidden absolute left-0 right-0 top-full mt-2 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-2xl z-[160] overflow-hidden text-gray-800 dark:text-zinc-100', 'data-pop': '1', 'data-testid': 'menu-novo' }, ACOES_NOVO().map(([g, itens]) => [h('p', { class: 'px-3.5 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-400' }, g), ...itens.map(([t, i_, fn]) => h('button', { type: 'button', class: 'w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-left hover:bg-gray-100 dark:hover:bg-zinc-800', onclick: () => { menuMovel = false; document.querySelectorAll('[data-pop]').forEach(x => x.classList.add('hidden')); fn() }, 'data-testid': 'novo-' + t.toLowerCase().replace(/[^a-z]+/g, '-') }, ic(i_, 'text-base text-primary dark:text-cafe-creme'), t))]))
  const b = h('button', { type: 'button', class: 'w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-cafe-creme text-cafe py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors', 'aria-haspopup': 'menu', 'data-testid': 'botao-novo' }, ic('ph:plus-bold'), 'Novo')
  b.addEventListener('click', e => { e.stopPropagation(); const abrir = caixa.classList.contains('hidden'); document.querySelectorAll('[data-pop]').forEach(x => x.classList.add('hidden')); caixa.classList.toggle('hidden', !abrir) })
  return h('div', { class: 'relative' }, b, caixa)
}
const botaoBuscar = () => h('button', { type: 'button', class: 'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-cafe-creme/60 bg-white/5 hover:bg-white/10 hover:text-white transition-colors text-left', onclick: abrirBusca, 'data-testid': 'nav-buscar' }, ic('ph:magnifying-glass-bold', 'text-base'), h('span', { class: 'flex-1' }, 'Buscar ou pedir'), h('kbd', { class: 'text-[9px] font-semibold rounded border border-white/20 px-1 py-0.5 text-cafe-creme/50' }, 'Ctrl K'))
function blocoMais(movel) {
  const aberto = NAVST.mais === true
  const itens = [['Meu perfil', 'ph:user-circle-bold', () => ir('perfil')], ['Link público de formulário', 'ph:link-bold', () => ir('publico', { sel: true })], ...(CONFIG.perfil.papel === 'admin' ? [['Exportar todos os dados', 'ph:download-bold', exportarTudo]] : [])]
  return h('div', { class: 'mt-2' }, h('button', { type: 'button', class: 'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[12px] font-semibold text-cafe-creme/60 hover:text-white hover:bg-white/5 transition-colors', 'aria-expanded': aberto ? 'true' : 'false', onclick: () => { NAVST.mais = !aberto; salvarNav(); render() }, 'data-testid': 'nav-mais' }, ic('ph:dots-three-circle-bold', 'text-base'), 'Mais', h('span', { class: 'ml-auto' }, ic(aberto ? 'ph:caret-down-bold' : 'ph:caret-right-bold', 'text-xs'))), aberto ? h('div', { class: 'ml-[18px] pl-2.5 border-l border-white/10 space-y-0.5 mt-0.5' }, itens.map(([t, i_, fn]) => h('button', { type: 'button', class: 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-cafe-creme/70 hover:bg-white/5 hover:text-white text-left', onclick: fn }, ic(i_, 'text-[13px] opacity-80'), t))) : null)
}
function barraLateral() {
  return h('aside', { class: 'hidden lg:flex flex-col w-64 shrink-0 bg-cafe text-cafe-creme h-screen px-3.5 py-5 sticky top-0', 'data-testid': 'sidebar' },
    h('button', { type: 'button', class: 'px-2.5 pb-4 flex items-center gap-2.5', onclick: () => ir('inicio'), 'aria-label': 'Início' }, h('img', { src: LOGOS.wordmarkLight, alt: 'Lara Café', class: 'h-6 w-auto' })),
    h('div', { class: 'space-y-2 pb-1' }, botaoNovo(), botaoBuscar()),
    h('nav', { class: 'flex-1 space-y-0.5 overflow-y-auto scrollbar-thin pr-0.5', 'aria-label': 'Menu principal' }, MODULOS().map(g => [h('p', { class: 'text-[9px] font-bold uppercase tracking-widest text-cafe-creme/40 px-2.5 pt-4 pb-1.5' }, g.grupo), ...g.itens.map(m => linhaModulo(m, false))]), blocoMais()),
    h('div', { class: 'mt-3 pt-3 border-t border-white/10 flex items-center gap-2.5 px-2' }, h('span', { class: 'w-8 h-8 rounded-full bg-white/15 shrink-0 inline-flex items-center justify-center text-xs font-bold' }, iniciaisDe(CONFIG.perfil.nome)), h('span', { class: 'min-w-0' }, h('span', { class: 'block text-xs font-bold text-white truncate' }, CONFIG.perfil.nome), h('button', { type: 'button', class: 'block text-[10px] text-cafe-creme/50 hover:text-cafe-creme truncate', onclick: () => ir('perfil') }, 'Meu perfil'))))
}
function navMovel() {
  return h('nav', { class: 'lg:hidden mx-3 mb-3 rounded-3xl bg-cafe p-3 space-y-1 max-h-[75vh] overflow-y-auto', 'aria-label': 'Menu' }, botaoNovo(true), botaoBuscar(), ...MODULOS().flatMap(g => g.itens.map(m => linhaModulo(m, true))), blocoMais(true))
}
document.addEventListener('keydown', ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); if (!document.querySelector('[data-testid=busca-global]')) abrirBusca() } })
function menuPopover(id, botao, conteudo) {
  const caixa = h('div', { class: 'hidden absolute right-0 top-12 w-80 max-w-[90vw] rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-xl z-[150] overflow-hidden', id }, conteudo)
  const alvo = h('div', { class: 'relative' }, botao, caixa)
  botao.addEventListener('click', e => { e.stopPropagation(); const abrir = caixa.classList.contains('hidden'); document.querySelectorAll('[data-pop]').forEach(x => x.classList.add('hidden')); caixa.classList.toggle('hidden', !abrir) }); caixa.setAttribute('data-pop', '1')
  return alvo
}
document.addEventListener('click', () => document.querySelectorAll('[data-pop]').forEach(x => x.classList.add('hidden')))
function cabecalho() {
  const itens = hojeItens()
  const sino = h('button', { type: 'button', class: 'relative h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300', 'aria-label': `Notificações (${itens.length})`, 'data-testid': 'sino' }, ic('ph:bell-bold', 'w-5 h-5'), itens.length ? h('span', { class: 'absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center' }, itens.length) : null)
  const notif = menuPopover('pop-sino', sino, [h('p', { class: 'px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400' }, 'O que pede atenção'), itens.length ? h('ul', { class: 'max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-800' }, itens.slice(0, 7).map(i => h('li', {}, h('button', { type: 'button', class: 'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800', onclick: () => ir('hoje') }, h('span', { class: 'block truncate' }, i.titulo), h('span', { class: 'text-[11px] text-gray-400' }, (i.contato_id ? nomeContato(i.contato_id) + ' · ' : '') + diaRelativo(i.quando)))))) : h('p', { class: 'px-4 py-5 text-sm text-gray-500' }, 'Tudo em dia por aqui.'), h('button', { type: 'button', class: 'w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-primary dark:text-cafe-creme border-t border-gray-100 dark:border-zinc-800', onclick: () => ir('hoje') }, 'Abrir o Hoje')])
  const perfilBtn = h('button', { type: 'button', class: 'h-10 inline-flex items-center gap-2 rounded-full pl-1 pr-2 hover:bg-gray-100 dark:hover:bg-zinc-800', 'aria-label': 'Menu do perfil', 'data-testid': 'perfil-btn' }, avatar(CONFIG.perfil.nome), h('span', { class: 'hidden sm:block text-sm font-semibold text-gray-700 dark:text-zinc-200' }, (CONFIG.perfil.nome || '').split(' ')[0]))
  const itemMenu = (t, ic_, fn) => h('button', { type: 'button', class: 'w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-800', onclick: fn }, ic(ic_), t)
  const perfil = menuPopover('pop-perfil', perfilBtn, [h('div', { class: 'px-4 py-3 border-b border-gray-100 dark:border-zinc-800' }, h('p', { class: 'font-semibold text-sm' }, CONFIG.perfil.nome), h('p', { class: 'text-xs text-gray-500' }, CONFIG.perfil.email + ' · ' + (CONFIG.perfil.papel === 'admin' ? 'Administradora' : 'Equipe'))), itemMenu('Meu perfil', 'ph:user-circle-bold', () => ir('perfil')), itemMenu('Abrir link público de formulário', 'ph:link-bold', () => ir('publico', { sel: true }))])
  return h('header', { class: 'sticky top-0 z-[100] w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-200/70 dark:border-zinc-800', 'data-testid': 'header' },
    h('div', { class: 'flex items-center justify-between h-14 lg:h-16 gap-3 px-4 sm:px-6' },
      h('button', { type: 'button', class: 'flex items-center gap-3 shrink-0 min-w-0 lg:hidden', onclick: () => ir('dashboard'), 'aria-label': 'Início' }, h('img', { src: LOGOS.monoDark, alt: 'Lara Café', class: 'h-6 w-auto dark:invert select-none' })),
      h('span', { class: 'hidden lg:flex items-center gap-2 text-xs text-gray-400' }, h('span', { id: 'estadoSalvo-wrap' }, ic('ph:cloud-check-bold'), ' '), h('span', { id: 'estadoSalvo', 'data-testid': 'estado-salvo' }, ARM.estado)),
      h('div', { class: 'flex items-center gap-1 sm:gap-2 shrink-0 ml-auto' }, h('button', { type: 'button', class: 'h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300', 'aria-label': 'Buscar', onclick: abrirBusca, 'data-testid': 'abrir-busca' }, ic('ph:magnifying-glass-bold', 'w-5 h-5')), notif, perfil,
        h('button', { type: 'button', class: 'h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300', 'aria-label': 'Alternar tema claro/escuro', onclick: () => { alternarTema(); render() }, 'data-testid': 'tema' }, ic(document.documentElement.classList.contains('dark') ? 'ph:sun-bold' : 'ph:moon-bold', 'w-5 h-5')),
        h('button', { type: 'button', class: 'h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300 lg:hidden', 'aria-label': menuMovel ? 'Fechar menu' : 'Abrir menu', onclick: () => { menuMovel = !menuMovel; render() }, 'data-testid': 'menu-movel' }, ic(menuMovel ? 'ph:x-bold' : 'ph:list-bold', 'w-6 h-6')))),
    menuMovel ? navMovel() : null)
}
function abrirBusca() {
  const res = h('div', { class: 'mt-3 space-y-1 max-h-[55vh] overflow-y-auto' })
  const entrada = h('input', { type: 'search', class: 'modal-input', placeholder: 'Nome, telefone, e-mail, demanda ou nº do processo…', 'data-testid': 'busca-global', 'aria-label': 'Busca global' })
  let m
  const lin = (icone, t, sub, fn) => h('button', { type: 'button', class: 'w-full text-left px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center gap-3', onclick: () => { m.fechar(); fn() } }, ic(icone, 'text-primary dark:text-cafe-creme'), h('span', { class: 'min-w-0' }, h('span', { class: 'block text-sm font-semibold truncate' }, t), h('span', { class: 'block text-[11px] text-gray-500 truncate' }, sub)))
  const buscar = () => {
    const q = semAcento(entrada.value.trim()); res.replaceChildren(); if (q.length < 2) { res.append(h('p', { class: 'text-sm text-gray-500 px-1' }, 'Digite pelo menos 2 letras.')); return }
    const cs = DB.contatos.filter(c => semAcento([c.nome, c.telefone, c.email].join(' ')).includes(q)).slice(0, 6)
    const ds = DB.demandas.filter(x => semAcento(x.titulo).includes(q)).slice(0, 4)
    const ps = DB.processos.filter(x => semAcento((x.numero || '') + ' ' + (x.orgao || '')).includes(q)).slice(0, 4)
    cs.forEach(c => res.append(lin('ph:user-bold', c.nome || c.telefone, CRM.etapa(c.etapa).nome + ' · ' + telefoneFormatado(c.telefone), () => abrirFicha(c.id))))
    ds.forEach(x => res.append(lin('ph:briefcase-bold', x.titulo, nomeContato(x.contato_id), () => ir('demandas', { abrir: x.id }))))
    ps.forEach(x => res.append(lin('ph:gavel-bold', x.numero || x.orgao, CRM.NATUREZAS_PROCESSO[x.natureza], () => ir('processos', { abrir: x.id }))))
    if (!res.children.length) res.append(estadoVazio('ph:magnifying-glass-bold', 'Nada encontrado', 'Tente outro trecho do nome, telefone ou número.'))
  }
  entrada.addEventListener('input', buscar)
  const planoIA = h('div', { class: 'mt-3' })
  const pedir = btn(CONFIG.ia.ativa ? 'Pedir à IA' : 'Pedir à IA (ligar)', { mini: true, tipo: 'sec', icone: 'ph:sparkle-bold', tid: 'ia-pedir', class: 'ia-btn', onclick: () => { const q = entrada.value.trim(); if (q.length < 6) { aviso('Descreva o que quer fazer (ex.: “criar tarefa de ligar para a Helena amanhã”).', 'erro'); return } exigirIA(async s => { if (ehPergunta(q)) { await responderPergunta(s, q, planoIA); return } planoIA.replaceChildren(carregando('Entendendo o pedido…')); try { mostrarPlano(await interpretarComando(s, q), planoIA) } catch (e) { planoIA.replaceChildren(alerta('erro', null, iaErro(e))) } }) } })
  m = modal({ titulo: 'Buscar ou pedir', largura: 'max-w-xl', corpo: [entrada, h('div', { class: 'flex items-center justify-between mt-2' }, h('p', { class: 'text-[11px] text-gray-400' }, 'Busca no CRM. A IA responde perguntas (“quais prazos esta semana?”) e propõe tarefas, prazos e anotações em frase; você confirma antes de gravar.'), pedir), res, planoIA] }); buscar()
}
function casca() {
  return h('div', { class: 'flex min-h-screen bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100' }, barraLateral(), h('div', { class: 'flex-1 min-w-0 flex flex-col' }, cabecalho(), h('main', { class: 'flex-1 min-w-0', id: 'conteudo', tabindex: '-1' }, (VIEWS[R.rota] || VIEWS.inicio)(R.p)), rodape()))
}
const rodape = () => h('footer', { class: 'px-4 sm:px-6 py-5 text-[11px] text-gray-400 text-center' }, 'Lara Café Advocacia & Consultoria · acesso restrito · dados protegidos conforme a LGPD · ', h('span', { class: 'text-amber-600 dark:text-amber-400' }, 'Dados de exemplo · WhatsApp abre o aplicativo · E-mail e IA usam os conectores da sua conta'))

