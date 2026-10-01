'use strict'
/* ============ Núcleo: DOM, ícones, formatação, tema ============ */
const $ = id => document.getElementById(id)
function h(tag, props, ...kids) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue
    if (k === 'class') e.className = v
    else if (k === 'text') e.textContent = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v)
    else if (k === 'style') e.style.cssText = v
    else if (k === 'value') e.value = v
    else if (k === 'checked') e.checked = !!v
    else if (k === 'selected') e.selected = !!v
    else if (k === 'disabled') e.disabled = !!v
    else e.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)))
  return e
}
const ic = (nome, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 256 256'); s.setAttribute('width', '1em'); s.setAttribute('height', '1em'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'inline-block shrink-0 ' + (cls || '')); s.innerHTML = ICONES[nome] || ''; return s }
const clonar = o => JSON.parse(JSON.stringify(o))
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const lsGet = (k, d) => { try { const v = localStorage.getItem('crmx_' + k); return v ? JSON.parse(v) : d } catch (e) { return d } }
const lsSet = (k, v) => { try { localStorage.setItem('crmx_' + k, JSON.stringify(v)) } catch (e) { /* sem armazenamento */ } }

/* ---- datas (fuso de Brasília, como o CRM) ---- */
const TZ = 'America/Bahia'
const hojeISO = (desloc = 0) => { const d = new Date(Date.now() + desloc * 864e5); return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d) }
const somarDias = (iso, n) => CRM.addDays(iso, n)
const diasEntre = (de, ate) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 864e5)
const dt = iso => new Date(String(iso).length === 10 ? iso + 'T12:00:00' : iso)
const dataCurta = iso => iso ? dt(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: String(iso).length === 10 ? undefined : TZ }) : ''
const dataLonga = iso => iso ? dt(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: String(iso).length === 10 ? undefined : TZ }) : ''
const dataHora = iso => iso ? dt(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }) : ''
const hhmm = iso => iso ? dt(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : ''
const diaDe = iso => iso ? (String(iso).length === 10 ? iso : new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(iso))) : ''
const mesAno = iso => dt(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
function diaRelativo(iso) {
  if (!iso) return ''
  const n = diasEntre(hojeISO(), diaDe(iso))
  return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n < 0 ? `há ${-n} dias` : `em ${n} dias`
}
const quandoRelativo = iso => { if (!iso) return ''; const m = Math.round((Date.now() - new Date(iso).getTime()) / 6e4); return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : diaRelativo(diaDe(iso)) }
const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brl2 = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const telefoneFormatado = t => { const d = String(t ?? '').replace(/\D/g, ''); const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/); return m ? `(${m[1]}) ${m[2]}-${m[3]}` : d }
const normalizarTelefone = raw => { let d = String(raw ?? '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return d }
const whatsappLink = t => { const d = String(t ?? '').replace(/\D/g, ''); return d ? 'https://wa.me/' + d : '' }
const iniciaisDe = nome => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`
const linkOk = u => { try { const x = new URL(String(u).trim()); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : '' } catch (e) { return '' } }
const numOuNull = v => { const t = String(v ?? '').trim(); if (t === '') return null; const n = Number(t.replace(/\./g, '').replace(',', '.')); return Number.isNaN(n) ? null : n }

/* ---- tema: segue o sistema, o seletor do visualizador ou o botão do próprio CRM ---- */
const TEMA = { pref: lsGet('tema', 'sistema') }
function aplicarTema() {
  const raiz = document.documentElement
  const explicito = raiz.getAttribute('data-theme')
  const sistema = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches
  const escuro = TEMA.pref === 'escuro' || (TEMA.pref === 'claro' ? false : (explicito ? explicito === 'dark' : sistema))
  raiz.classList.toggle('dark', escuro)
}
function alternarTema() { TEMA.pref = document.documentElement.classList.contains('dark') ? 'claro' : 'escuro'; lsSet('tema', TEMA.pref); aplicarTema() }
aplicarTema()
if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema)
new MutationObserver(aplicarTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

/* ---- avisos (toast) ---- */
function aviso(texto, tipo) {
  let c = $('toasts'); if (!c) { c = h('div', { id: 'toasts', class: 'fixed bottom-4 right-4 z-[400] flex flex-col gap-2 max-w-sm', role: 'status', 'aria-live': 'polite' }); document.body.append(c) }
  const cor = tipo === 'erro' ? 'bg-danger text-white' : 'bg-primary text-white dark:bg-cafe-creme dark:text-cafe'
  const t = h('div', { class: 'rounded-2xl px-4 py-3 text-sm shadow-lg flex items-center gap-2 ' + cor, 'data-testid': 'toast' }, ic(tipo === 'erro' ? 'ph:warning-bold' : 'ph:check-circle-bold'), texto)
  c.append(t); setTimeout(() => t.remove(), 4200)
}
