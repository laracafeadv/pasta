'use strict'
/* ============ Componentes de interface (mesmas classes/estados do CRM real) ============ */
const BTN = {
  primario: 'bg-primary text-white hover:bg-primary/90 dark:bg-cafe-creme dark:text-cafe',
  sec: 'border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-200 hover:border-primary hover:text-primary',
  perigo: 'bg-danger text-white hover:opacity-90',
  fantasma: 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800',
}
function btn(texto, o = {}) {
  const tam = o.mini ? 'text-[11px] px-3 py-1' : 'text-xs px-4 py-2'
  return h('button', { type: 'button', class: `inline-flex items-center justify-center gap-1.5 rounded-full font-semibold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tam} ${BTN[o.tipo || 'primario']} ${o.class || ''}`, onclick: o.onclick, disabled: o.disabled, title: o.title, 'data-testid': o.tid, 'aria-label': o.aria }, o.icone ? ic(o.icone) : null, texto)
}
const btnIcone = (icone, titulo, onclick, tid) => h('button', { type: 'button', class: 'acao', title: titulo, 'aria-label': titulo, onclick, 'data-testid': tid }, ic(icone))
const BADGE_COR = { verde: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200', ambar: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200', vermelho: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200', azul: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200', cinza: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300', cafe: 'bg-cafe-creme text-cafe dark:bg-cafe-claro/30 dark:text-cafe-creme', roxo: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200' }
const badge = (texto, cor = 'cinza', icone) => h('span', { class: `inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${BADGE_COR[cor] || BADGE_COR.cinza}` }, icone ? ic(icone) : null, texto)
const ETAPA_COR = { novo: 'azul', qualificacao: 'azul', agendado: 'roxo', diagnostico: 'roxo', proposta: 'ambar', ativo: 'verde', concluido: 'cafe', perdido: 'cinza', relacionado: 'cinza' }
const badgeEtapa = id => badge(CRM.etapa(id).nome, ETAPA_COR[id])
const sitCor = s => s === 'atrasado' ? 'vermelho' : s === 'hoje' ? 'ambar' : 'cinza'
const badgeData = (data, rotuloAtraso) => { const s = situacaoOf(diaDe(data)); return badge((s === 'atrasado' ? (rotuloAtraso || 'Atrasado') + ' · ' : '') + dataCurta(data) + ' · ' + diaRelativo(diaDe(data)), sitCor(s)) }
const avatar = (nome, grande) => h('span', { class: `inline-flex items-center justify-center rounded-full bg-cafe text-cafe-creme font-semibold shrink-0 ${grande ? 'w-12 h-12 text-base' : 'w-8 h-8 text-xs'}` }, iniciaisDe(nome))
const link = (texto, onclick, cls) => h('button', { type: 'button', class: `text-left font-semibold text-primary dark:text-cafe-creme hover:underline ${cls || ''}`, onclick }, texto)

/* ---- estados: vazio / carregando / erro / sucesso ---- */
const estadoVazio = (icone, titulo, texto, acao) => h('div', { class: 'text-center py-10 px-4 text-gray-500 dark:text-zinc-400', 'data-testid': 'vazio' }, h('div', { class: 'mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 inline-flex items-center justify-center text-xl mb-3' }, ic(icone)), h('p', { class: 'font-serif text-lg text-primary dark:text-zinc-100' }, titulo), texto ? h('p', { class: 'text-sm mt-1 max-w-md mx-auto' }, texto) : null, acao ? h('div', { class: 'mt-4' }, acao) : null)
const carregando = (texto = 'Carregando…') => h('div', { class: 'py-10 flex items-center justify-center gap-3 text-sm text-gray-500', role: 'status' }, h('span', { class: 'w-5 h-5 rounded-full border-2 border-gray-300 border-t-primary animate-spin' }), texto)
const esqueleto = n => h('div', { class: 'space-y-2 animate-pulse' }, Array.from({ length: n }, () => h('div', { class: 'h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800' })))
const alerta = (tipo, titulo, texto) => { const m = { info: ['bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-900 dark:text-sky-100', 'ph:info-bold'], ok: ['bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-100', 'ph:check-circle-bold'], aviso: ['bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100', 'ph:warning-bold'], erro: ['bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-100', 'ph:warning-circle-bold'] }[tipo]; return h('div', { class: `rounded-2xl border px-4 py-3 text-sm flex gap-3 ${m[0]}`, role: tipo === 'erro' ? 'alert' : 'status' }, ic(m[1], 'text-lg mt-0.5'), h('div', {}, titulo ? h('p', { class: 'font-semibold' }, titulo) : null, texto ? h('p', {}, texto) : null)) }

/* ---- layout de página ---- */
const pagina = (titulo, sub, acoes, ...corpo) => h('div', { class: 'max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5' }, !titulo ? null : h('div', { class: 'flex flex-wrap items-end justify-between gap-3' }, h('div', { class: 'min-w-0' }, h('h1', { class: 'text-2xl sm:text-3xl text-primary dark:text-zinc-100', 'data-testid': 'titulo-pagina' }, titulo), sub ? h('p', { class: 'text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-2xl' }, sub) : null), acoes ? h('div', { class: 'flex flex-wrap gap-2' }, acoes) : null), ...corpo)
const painel = (titulo, ...corpo) => h('section', { class: 'painel' }, titulo ? h('h2', { class: 'titulo mb-3' }, titulo) : null, ...corpo)
const kpi = (rotulo, valor, sub, onclick) => h(onclick ? 'button' : 'div', { class: 'kpi text-left ' + (onclick ? 'hover:border-primary transition-colors' : ''), onclick, type: onclick ? 'button' : null }, h('span', {}, rotulo), h('b', { class: 'font-serif' }, valor), sub ? h('small', {}, sub) : null)
const grade = (cols, ...kids) => h('div', { class: { 2: 'grid gap-3 sm:grid-cols-2', 3: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid gap-3 grid-cols-2 lg:grid-cols-4' }[cols] }, ...kids)
const abas = (lista, ativa, aoMudar) => h('div', { class: 'flex gap-2 overflow-x-auto scrollbar-thin pb-1', role: 'tablist' }, lista.map(a => h('button', { type: 'button', role: 'tab', 'aria-selected': a.id === ativa ? 'true' : 'false', class: 'tab-btn whitespace-nowrap ' + (a.id === ativa ? 'tab-btn-ativo' : ''), onclick: () => aoMudar(a.id), 'data-testid': 'aba-' + a.id }, a.icone ? ic(a.icone, 'mr-1') : null, a.nome, a.n ? h('span', { class: 'ml-1.5 text-[10px] opacity-80' }, `(${a.n})`) : null)))
const filtros = (lista, ativo, aoMudar) => h('div', { class: 'flex flex-wrap gap-1.5' }, lista.map(f => h('button', { type: 'button', class: 'filtro ' + (f.id === ativo ? 'filtro-ativo' : ''), onclick: () => aoMudar(f.id) }, f.nome)))
const busca = (valor, aoDigitar, ph = 'Buscar…') => { const i = h('input', { type: 'search', class: 'modal-input !rounded-full !py-2 !pl-10', placeholder: ph, value: valor || '', 'aria-label': ph, 'data-testid': 'busca' }); i.addEventListener('input', () => aoDigitar(i.value, i)); return h('div', { class: 'relative' }, ic('ph:magnifying-glass-bold', 'absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'), i) }
function tabela(colunas, linhas, opc = {}) {
  if (!linhas.length) return estadoVazio(opc.icone || 'ph:tray-bold', opc.vazio || 'Nada por aqui', opc.vazioTexto)
  return h('div', { class: 'overflow-x-auto rounded-2xl border border-gray-200/70 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50' }, h('table', { class: 'w-full text-sm min-w-[560px]' }, h('thead', {}, h('tr', { class: 'text-left text-[10px] uppercase tracking-widest text-gray-400' }, colunas.map(c => h('th', { class: 'px-4 py-2.5 font-bold ' + (c.cls || '') }, c.nome)))), h('tbody', { class: 'divide-y divide-gray-100 dark:divide-zinc-800' }, linhas.map(l => h('tr', { class: 'hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 ' + (opc.clique ? 'cursor-pointer' : ''), onclick: opc.clique ? () => opc.clique(l) : null }, colunas.map(c => h('td', { class: 'px-4 py-3 align-top ' + (c.cls || '') }, c.cel(l))))))))
}

/* ---- modal e drawer (z acima do cabeçalho) ---- */
const CAMADAS = new Set()
const fecharTodas = () => [...CAMADAS].forEach(f => f(true))
function camada(tipo, { titulo, corpo, rodape, largura, aoFechar }) {
  const anterior = document.activeElement
  const fechar = (silencioso) => { CAMADAS.delete(fechar); fundo.remove(); document.removeEventListener('keydown', tecla); if (silencioso !== true) { anterior && anterior.focus && anterior.focus(); aoFechar && aoFechar() } }
  const tecla = e => { if (e.key === 'Escape') fechar() }
  const lado = tipo === 'drawer'
  const caixa = h('div', { class: lado ? `ml-auto h-full w-full ${largura || 'max-w-xl'} bg-white dark:bg-zinc-900 shadow-2xl flex flex-col` : `m-auto w-full ${largura || 'max-w-lg'} max-h-[90vh] rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col`, role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo, 'data-testid': tipo }, h('div', { class: 'flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-zinc-800' }, h('h2', { class: 'font-serif text-xl text-primary dark:text-zinc-100 truncate' }, titulo), h('button', { type: 'button', class: 'acao', 'aria-label': 'Fechar', onclick: fechar, 'data-testid': 'fechar' }, ic('ph:x-bold'))), h('div', { class: 'flex-1 overflow-y-auto px-5 py-4 scrollbar-thin', 'data-testid': 'camada-corpo' }, typeof corpo === 'function' ? corpo(fechar) : corpo), rodape ? h('div', { class: 'px-5 py-3 border-t border-gray-100 dark:border-zinc-800 flex flex-wrap justify-end gap-2' }, typeof rodape === 'function' ? rodape(fechar) : rodape) : null)
  const fundo = h('div', { class: 'fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px] flex p-3 sm:p-6' + (lado ? ' !p-0' : ''), onmousedown: e => { if (e.target === fundo) fechar() } }, caixa)
  document.body.append(fundo); CAMADAS.add(fechar); document.addEventListener('keydown', tecla)
  const primeiro = caixa.querySelector('input,select,textarea') || caixa.querySelector('button'); primeiro && primeiro.focus()
  return { fechar, caixa }
}
const REDES = new Set()
const atualizarCamadas = () => REDES.forEach(f => f())
const modal = o => camada('modal', o)
const drawer = o => camada('drawer', o)
const confirmar = (titulo, texto, rotulo, aoConfirmar, perigo = true) => modal({ titulo, largura: 'max-w-md', corpo: h('p', { class: 'text-sm text-gray-600 dark:text-zinc-300' }, texto), rodape: f => [btn('Cancelar', { tipo: 'sec', onclick: f }), btn(rotulo, { tipo: perigo ? 'perigo' : 'primario', tid: 'confirmar-sim', onclick: () => { f(); aoConfirmar(); atualizarCamadas() } })] })

/* ---- campos e formulário a partir de especificação ---- */
const rotuloCampo = (texto, ajuda, obrig) => h('span', { class: 'block text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-400 mb-1' }, texto, obrig ? h('span', { class: 'text-danger ml-0.5' }, '*') : null)
function criarCampo(c, valor) {
  let el
  const base = 'modal-input'
  if (c.tipo === 'textarea') el = h('textarea', { class: base + ' min-h-[88px]', rows: c.linhas || 3, placeholder: c.ph }, '')
  else if (c.tipo === 'select') el = h('select', { class: base }, c.opcoes.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v }, t) }))
  else if (c.tipo === 'check') el = h('input', { type: 'checkbox', class: 'w-4 h-4 accent-[#6f5636]' })
  else el = h('input', { type: { data: 'date', datahora: 'datetime-local', numero: 'text', email: 'email', tel: 'tel' }[c.tipo] || 'text', class: base, placeholder: c.ph, inputmode: c.tipo === 'numero' ? 'decimal' : null })
  el.setAttribute('data-campo', c.chave)
  if (c.tipo === 'check') el.checked = !!valor; else if (c.tipo === 'datahora') el.value = valor ? new Date(valor).toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T').slice(0, 16) : ''; else if (valor != null) el.value = valor
  return el
}
function formularioSpec(campos, valores = {}) {
  const els = {}; const erros = {}
  const grade2 = h('div', { class: 'grid gap-3 sm:grid-cols-2' })
  for (const c of campos) {
    if (c.secao) { grade2.append(h('p', { class: 'sm:col-span-2 section-label mt-2' }, c.secao)); continue }
    const el = criarCampo(c, valores[c.chave]); els[c.chave] = el
    const err = h('p', { class: 'text-xs text-danger mt-1', hidden: true, role: 'alert' }); erros[c.chave] = err
    const ctl = c.tipo === 'check' ? h('label', { class: 'flex items-center gap-2 text-sm' }, el, c.rotulo) : h('label', { class: 'block' }, rotuloCampo(c.rotulo, null, c.obrigatorio), el, c.dica ? h('span', { class: 'block text-[11px] text-gray-400 mt-1' }, c.dica) : null, err)
    grade2.append(h('div', { class: c.largo || c.tipo === 'textarea' ? 'sm:col-span-2' : '' }, ctl, c.tipo === 'check' ? err : null))
  }
  const ler = () => { const o = {}; for (const c of campos) { if (c.secao) continue; const el = els[c.chave]; let v = c.tipo === 'check' ? el.checked : el.value; if (c.tipo === 'numero') v = numOuNull(v); else if (c.tipo === 'datahora') v = v ? new Date(v + ':00-03:00').toISOString() : null; else if (typeof v === 'string') v = v.trim() === '' ? null : v.trim(); if (c.tipo === 'select' && c.numerico && v != null) v = Number(v); o[c.chave] = v } return o }
  const validar = () => { let ok = true; const v = ler(); for (const c of campos) { if (c.secao) continue; const msg = c.obrigatorio && (v[c.chave] == null || v[c.chave] === '') ? 'Obrigatório.' : (c.valida ? c.valida(v[c.chave], v) : null); erros[c.chave].hidden = !msg; erros[c.chave].textContent = msg || ''; els[c.chave].setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) ok = false } return ok ? v : null }
  return { el: grade2, ler, validar, els }
}
function modalForm(titulo, campos, valores, aoSalvar, opc = {}) {
  const f = formularioSpec(campos, valores)
  return modal({ titulo, largura: opc.largura || 'max-w-xl', corpo: f.el, rodape: fechar => [opc.extra, btn('Cancelar', { tipo: 'sec', onclick: fechar }), btn(opc.rotulo || 'Salvar', { tid: 'salvar', onclick: () => { const v = f.validar(); if (!v) return; const r = aoSalvar(v); if (r && r.erro) { aviso(r.erro, 'erro'); return } fechar(); render(); atualizarCamadas() } })] })
}
const opcoesContatos = (filtro) => [['', '— nenhum —'], ...DB.contatos.filter(filtro || (() => true)).map(c => [c.id, c.nome || c.telefone])]
const opcoesDemandas = () => [['', '— nenhuma —'], ...DB.demandas.map(x => [x.id, `${x.titulo}`])]
const dica = texto => h('span', { class: 'inline-flex', title: texto, 'aria-label': texto }, ic('ph:info-bold', 'text-gray-400'))
const copiar = async (texto) => { try { await navigator.clipboard.writeText(texto); aviso('Copiado.') } catch (e) { aviso('Seu navegador não permitiu copiar; selecione e copie manualmente.', 'erro') } }
const rotuloAba = (nome, n) => nome + (n ? ` (${n})` : '')
function lista(itens) { return h('ul', { class: 'divide-y divide-gray-100 dark:divide-zinc-800' }, itens.map(i => h('li', { class: 'py-2.5 flex items-start gap-3 text-sm' }, i))) }
function campoLeitura(rotulo, valor) { return h('div', { class: 'min-w-0' }, h('p', { class: 'text-[10px] font-bold uppercase tracking-widest text-gray-400' }, rotulo), h('p', { class: 'text-sm break-words text-gray-800 dark:text-zinc-100' }, valor == null || valor === '' ? '—' : valor)) }
