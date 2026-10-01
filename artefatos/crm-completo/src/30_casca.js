'use strict'
/* ============ Casca: roteador, barra lateral, cabeçalho, busca, notificações, login ============ */
const VIEWS = {}            // rota -> (params) => elemento
const NAV = () => [
  { titulo: 'Trabalho', itens: [['dashboard', 'Dashboard', 'ph:squares-four-bold'], ['secretaria', 'Secretária', 'ph:notebook-bold'], ['hoje', 'Hoje', 'ph:sun-bold', pendenciasHoje()], ['tarefas', 'Tarefas', 'ph:check-square-bold'], ['prazos', 'Prazos', 'ph:hourglass-high-bold'], ['intimacoes', 'Intimações', 'ph:megaphone-bold'], ['agenda', 'Agenda', 'ph:calendar-bold']] },
  { titulo: 'Pessoas', itens: [['leads', 'Leads', 'ph:kanban-bold'], ['clientes', 'Clientes', 'ph:users-bold'], ['mensagens', 'Mensagens', 'ph:chat-circle-text-bold'], ['remarketing', 'Remarketing', 'ph:arrow-counter-clockwise-bold']] },
  { titulo: 'Serviços jurídicos', itens: [['demandas', 'Demandas', 'ph:briefcase-bold'], ['processos', 'Processos', 'ph:gavel-bold'], ['documentos', 'Documentos', 'ph:files-bold']] },
  { titulo: 'Dinheiro', itens: [['financeiro', 'Financeiro', 'ph:wallet-bold'], ['relatorios', 'Relatórios', 'ph:chart-bar-bold']] },
  { titulo: 'Escritório', itens: [['formularios', 'Formulários', 'ph:clipboard-text-bold'], ['manual', 'Padrões operacionais', 'ph:list-checks-bold'], ['mapa', 'Mapa operacional', 'ph:flow-arrow-bold'], ...(CONFIG.perfil.papel === 'admin' ? [['config', 'Configurações', 'ph:gear-bold'], ['auditoria', 'Auditoria', 'ph:shield-check-bold']] : [])] },
].map(g => g.titulo === 'Dinheiro' ? { ...g, itens: g.itens.map(i => i[0] === 'financeiro' && CONFIG.perfil.papel !== 'admin' ? ['financeiro', 'Honorários', i[2]] : i) } : g)
const ROTAS_ROTULO = { perfil: 'Meu perfil' }
const R = { rota: 'dashboard', p: {} }
let menuMovel = false

let CONSTR = null
function ir(rota, p = {}) { fecharTodas(); REDES.clear(); if (!(rota === 'formularios' && p.editar)) CONSTR = null; R.rota = rota; R.p = p; menuMovel = false; try { history.replaceState(null, '', '#' + rota) } catch (e) { /* sem histórico */ } render(); window.scrollTo(0, 0) }
function lerHash() { const r = (location.hash || '').replace('#', ''); return VIEWS[r] ? r : null }

function guardarFoco() { const a = document.activeElement; if (!a || !a.getAttribute) return null; const k = a.getAttribute('data-testid') || a.getAttribute('data-campo'); if (!k || !/^(INPUT|TEXTAREA)$/.test(a.tagName) || a.closest('[role=dialog]')) return null; return { k, attr: a.getAttribute('data-testid') ? 'data-testid' : 'data-campo', ini: a.selectionStart, fim: a.selectionEnd } }
function restaurarFoco(f) { if (!f) return; const el = document.querySelector(`[${f.attr}="${f.k}"]`); if (el) { el.focus(); try { el.setSelectionRange(f.ini, f.fim) } catch (e) { /* tipo sem seleção */ } } }

function render() {
  const foco = guardarFoco(); const y = window.scrollY; const raiz = $('app')
  const dentro = R.rota === 'login' ? telaLogin() : R.rota === 'recuperar' ? telaRecuperar() : R.rota === 'privacidade' ? telaPrivacidade() : R.rota === 'publico' ? FormulariosPublico() : casca()
  raiz.replaceChildren(dentro); window.scrollTo(0, y); restaurarFoco(foco); document.title = 'CRM Lara Café'
}

function itemNav([rota, rotulo, icone, n], movel) {
  const ativo = R.rota === rota || (rota === 'clientes' && R.rota === 'ficha')
  const base = movel ? 'flex items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-full ' + (ativo ? 'bg-cafe-creme text-cafe' : 'text-cafe-creme/80') : 'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-colors w-full text-left ' + (ativo ? 'bg-white/10 text-white' : 'text-cafe-creme/80 hover:bg-white/5 hover:text-white')
  return h('button', { type: 'button', class: base, onclick: () => ir(rota), 'aria-current': ativo ? 'page' : null, 'data-testid': 'nav-' + rota }, movel ? rotulo : [ic(icone, 'text-base shrink-0'), h('span', { class: 'truncate' }, rotulo)], n ? h('span', { class: 'ml-auto min-w-[17px] h-[17px] px-1 rounded-full bg-danger text-white text-[10px] font-bold inline-flex items-center justify-center' }, n) : null)
}
function barraLateral() {
  return h('aside', { class: 'hidden lg:flex flex-col w-60 shrink-0 bg-cafe text-cafe-creme h-screen px-3.5 py-6 sticky top-0', 'data-testid': 'sidebar' },
    h('button', { type: 'button', class: 'px-2.5 pb-6 flex items-center gap-2.5', onclick: () => ir('dashboard'), 'aria-label': 'Início' }, h('img', { src: LOGOS.wordmarkLight, alt: 'Lara Café', class: 'h-6 w-auto' })),
    h('nav', { class: 'flex-1 space-y-0.5 overflow-y-auto scrollbar-thin', 'aria-label': 'Menu principal' }, NAV().map(g => [h('p', { class: 'text-[9px] font-bold uppercase tracking-widest text-cafe-creme/40 px-2.5 pt-4 pb-1.5' }, g.titulo), ...g.itens.map(i => itemNav(i, false))])),
    h('div', { class: 'mt-4 pt-3 border-t border-white/10 flex items-center gap-2.5 px-2' }, h('span', { class: 'w-8 h-8 rounded-full bg-white/15 shrink-0 inline-flex items-center justify-center text-xs font-bold' }, iniciaisDe(CONFIG.perfil.nome)), h('span', { class: 'min-w-0' }, h('span', { class: 'block text-xs font-bold text-white truncate' }, CONFIG.perfil.nome), h('button', { type: 'button', class: 'block text-[10px] text-cafe-creme/50 hover:text-cafe-creme truncate', onclick: () => ir('perfil') }, 'Meu perfil'))))
}
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
  const perfil = menuPopover('pop-perfil', perfilBtn, [h('div', { class: 'px-4 py-3 border-b border-gray-100 dark:border-zinc-800' }, h('p', { class: 'font-semibold text-sm' }, CONFIG.perfil.nome), h('p', { class: 'text-xs text-gray-500' }, CONFIG.perfil.email + ' · ' + (CONFIG.perfil.papel === 'admin' ? 'Administradora' : 'Equipe'))), itemMenu('Meu perfil', 'ph:user-circle-bold', () => ir('perfil')), itemMenu('Abrir link público de formulário', 'ph:link-bold', () => ir('publico', { sel: true })), itemMenu('Sair', 'ph:sign-out-bold', () => ir('login'))])
  return h('header', { class: 'sticky top-0 z-[100] w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-200/70 dark:border-zinc-800', 'data-testid': 'header' },
    h('div', { class: 'flex items-center justify-between h-14 lg:h-16 gap-3 px-4 sm:px-6' },
      h('button', { type: 'button', class: 'flex items-center gap-3 shrink-0 min-w-0 lg:hidden', onclick: () => ir('dashboard'), 'aria-label': 'Início' }, h('img', { src: LOGOS.monoDark, alt: 'Lara Café', class: 'h-6 w-auto dark:invert select-none' })),
      h('span', { class: 'hidden lg:flex items-center gap-2 text-xs text-gray-400' }, h('span', { id: 'estadoSalvo-wrap' }, ic('ph:cloud-check-bold'), ' '), h('span', { id: 'estadoSalvo', 'data-testid': 'estado-salvo' }, ARM.estado)),
      h('div', { class: 'flex items-center gap-1 sm:gap-2 shrink-0 ml-auto' }, h('button', { type: 'button', class: 'h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300', 'aria-label': 'Buscar', onclick: abrirBusca, 'data-testid': 'abrir-busca' }, ic('ph:magnifying-glass-bold', 'w-5 h-5')), notif, perfil,
        h('button', { type: 'button', class: 'h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300', 'aria-label': 'Alternar tema claro/escuro', onclick: () => { alternarTema(); render() }, 'data-testid': 'tema' }, ic(document.documentElement.classList.contains('dark') ? 'ph:sun-bold' : 'ph:moon-bold', 'w-5 h-5')),
        h('button', { type: 'button', class: 'h-10 w-10 inline-flex items-center justify-center rounded-full text-gray-500 hover:text-primary dark:text-zinc-300 lg:hidden', 'aria-label': menuMovel ? 'Fechar menu' : 'Abrir menu', onclick: () => { menuMovel = !menuMovel; render() }, 'data-testid': 'menu-movel' }, ic(menuMovel ? 'ph:x-bold' : 'ph:list-bold', 'w-6 h-6')))),
    menuMovel ? h('nav', { class: 'lg:hidden mx-3 mb-3 rounded-3xl bg-cafe p-3 space-y-1 max-h-[70vh] overflow-y-auto', 'aria-label': 'Menu' }, NAV().flatMap(g => g.itens).map(i => itemNav(i, true))) : null)
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
  m = modal({ titulo: 'Buscar', largura: 'max-w-xl', corpo: [entrada, res] }); buscar()
}
function casca() {
  return h('div', { class: 'flex min-h-screen bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100' }, barraLateral(), h('div', { class: 'flex-1 min-w-0 flex flex-col' }, cabecalho(), h('main', { class: 'flex-1 min-w-0', id: 'conteudo', tabindex: '-1' }, (VIEWS[R.rota] || VIEWS.dashboard)(R.p)), rodape()))
}
const rodape = () => h('footer', { class: 'px-4 sm:px-6 py-5 text-[11px] text-gray-400 text-center' }, 'Lara Café Advocacia & Consultoria · acesso restrito · dados protegidos conforme a LGPD · ', h('span', { class: 'text-amber-600 dark:text-amber-400' }, 'Versão de demonstração: clientes e integrações externas são simulados'))

function telaLogin() {
  const msg = h('p', { class: 'text-sm text-danger', role: 'alert', hidden: true })
  const e = h('input', { type: 'email', class: 'modal-input', placeholder: 'voce@laracafe.adv.br', autocomplete: 'email', 'data-testid': 'login-email' })
  const s = h('input', { type: 'password', class: 'modal-input', placeholder: '••••••••', autocomplete: 'current-password', 'data-testid': 'login-senha' })
  const enviar = ev => { ev.preventDefault(); if (!e.value || !s.value) { msg.hidden = false; msg.textContent = 'Preencha e-mail e senha.'; return } ir('dashboard') }
  return h('div', { class: 'min-h-screen relative flex items-center justify-center px-4 py-14 overflow-hidden bg-cafe' },
    h('div', { class: 'absolute inset-0', style: 'background:radial-gradient(ellipse at top left,rgba(139,111,71,.3),transparent 55%),radial-gradient(ellipse at bottom right,#3c2923,#2a1c18)' }),
    h('img', { src: LOGOS.monoLight, alt: '', class: 'absolute -right-24 -bottom-24 h-[34rem] opacity-[0.06] pointer-events-none select-none' }),
    h('div', { class: 'relative z-10 w-full max-w-md' },
      h('div', { class: 'rounded-[2rem] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/30 ring-1 ring-white/10 px-8 py-10 sm:px-10 sm:py-12' },
        h('div', { class: 'text-center' }, h('img', { src: LOGOS.monoDark, alt: 'Lara Café', class: 'h-14 w-auto mx-auto dark:invert' }), h('p', { class: 'eyebrow mt-5' }, 'Área do escritório'), h('h1', { class: 'text-3xl text-primary dark:text-zinc-100 mt-1' }, 'Acesso restrito'), h('p', { class: 'text-sm text-gray-500 mt-2' }, 'Use o e-mail e a senha do seu usuário.')),
        h('form', { class: 'space-y-4 mt-8', onsubmit: enviar }, h('label', { class: 'block' }, rotuloCampo('E-mail'), e), h('label', { class: 'block' }, rotuloCampo('Senha'), s), h('div', { class: 'flex items-center justify-between' }, h('label', { class: 'flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-300' }, h('input', { type: 'checkbox', class: 'accent-[#6f5636]' }), 'Lembrar de mim'), h('button', { type: 'button', class: 'text-sm font-semibold text-primary dark:text-cafe-creme hover:underline', onclick: () => ir('recuperar'), 'data-testid': 'esqueci-senha' }, 'Esqueceu a senha?')), msg, h('button', { type: 'submit', class: 'w-full rounded-full bg-primary text-white py-3 text-xs font-semibold uppercase tracking-wider', 'data-testid': 'login-entrar' }, 'Entrar'), h('p', { class: 'text-[11px] text-amber-600 text-center' }, 'Demonstração: qualquer e-mail e senha entram (sem autenticação real).'))),
      h('p', { class: 'text-xs text-cafe-creme/60 text-center leading-relaxed mt-6' }, 'Acesso restrito · dados protegidos conforme a LGPD · ', h('button', { type: 'button', class: 'underline underline-offset-2 hover:text-cafe-creme', onclick: () => ir('privacidade'), 'data-testid': 'ver-privacidade' }, 'Política de privacidade'))))
}

function telaRecuperar() {
  const e = h('input', { type: 'email', class: 'modal-input', placeholder: 'voce@laracafe.adv.br', 'data-testid': 'rec-email' }); const msg = h('p', { class: 'text-sm', role: 'status', hidden: true })
  return h('div', { class: 'min-h-screen flex items-center justify-center px-4 py-14 bg-cafe' }, h('div', { class: 'w-full max-w-md rounded-[2rem] bg-white/95 dark:bg-zinc-900/95 px-8 py-10 space-y-5 shadow-2xl' }, h('img', { src: LOGOS.monoDark, alt: 'Lara Café', class: 'h-12 w-auto mx-auto dark:invert' }), h('div', {}, h('h1', { class: 'text-2xl text-primary dark:text-zinc-100' }, 'Recuperar senha'), h('p', { class: 'text-sm text-gray-500' }, 'Informe seu e-mail para receber as instruções de recuperação.')),
    h('form', { class: 'space-y-4', onsubmit: ev => { ev.preventDefault(); msg.hidden = false; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.value)) { msg.className = 'text-sm text-danger'; msg.textContent = 'Informe um e-mail válido.'; return } msg.className = 'text-sm text-success'; msg.textContent = 'Se o e-mail existir, enviaremos as instruções. (Simulado: nenhum e-mail é enviado.)' } }, h('label', { class: 'block' }, rotuloCampo('E-mail'), e), msg, h('button', { type: 'submit', class: 'w-full rounded-full bg-primary text-white py-3 text-xs font-semibold uppercase tracking-wider' }, 'Enviar instruções')), h('button', { type: 'button', class: 'text-sm text-gray-500 hover:underline', onclick: () => ir('login') }, '← Voltar ao login')))
}
function telaPrivacidade() {
  return h('div', { class: 'min-h-screen bg-[#edeae2] dark:bg-zinc-950 py-12 px-4' }, h('div', { class: 'max-w-3xl mx-auto px-6 py-12 rounded-[2rem] bg-white/70 dark:bg-zinc-900/60 border border-gray-200/70 dark:border-zinc-800 space-y-5 text-sm leading-relaxed' }, h('p', { class: 'eyebrow' }, 'Privacidade'), h('h1', { class: 'text-4xl text-primary dark:text-zinc-100' }, 'Como tratamos os dados'),
    h('p', {}, 'Este sistema é de uso interno do escritório ', h('strong', {}, 'Lara Café Advocacia & Consultoria'), '. Ele guarda os dados que clientes e interessados informam no atendimento (inclusive pelo WhatsApp) exclusivamente para a prestação dos serviços jurídicos, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e com o dever de sigilo profissional.'),
    h('p', {}, 'A política completa, com finalidades, bases legais, prazos de guarda e como exercer seus direitos, está publicada no site do escritório:'), h('a', { href: 'https://laracafe.com.br/politica-de-privacidade', target: '_blank', rel: 'noopener', class: 'inline-block px-6 py-2.5 rounded-full border border-primary/40 text-primary dark:text-zinc-200 text-xs font-semibold uppercase tracking-[0.14em] hover:bg-primary hover:text-white transition-colors' }, 'Ler a política de privacidade'),
    h('p', { class: 'text-gray-500' }, 'Pedidos sobre seus dados: laracafe.adv@gmail.com'), btn('Voltar', { tipo: 'sec', onclick: () => ir('login') })))
}
