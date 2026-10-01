// PostgREST mínimo em memória, só para testar o servidor Nuxt real (webhooks/endpoints) sem tocar no Supabase de produção.
import http from 'node:http'
export const DB = {}
const FK = { contato: ['contatos', 'contato_id'], formulario: ['formularios', 'formulario_id'], caso: ['casos', 'caso_id'], pergunta: ['formulario_perguntas', 'pergunta_id'] }
let seq = 1000
export function criar(seed) {
  for (const k of Object.keys(DB)) delete DB[k]
  Object.assign(DB, JSON.parse(JSON.stringify(seed)))
}
const tabela = n => (DB[n] ??= [])
function filtros(q, rows) {
  for (const [k, v] of q.entries()) {
    if (['select', 'order', 'limit', 'on_conflict', 'offset'].includes(k)) continue
    if (k === 'or') { const parts = v.replace(/^\(|\)$/g, '').split(','); rows = rows.filter(r => parts.some(p => { const [c, op, val] = p.split('.'); return op === 'is' ? (val === 'null' ? r[c] == null : String(r[c]) === val) : String(r[c]) === val })); continue }
    const m = v.match(/^(eq|neq|is|in|gte|lte|gt|lt)\.(.*)$/); if (!m) continue; const [, op, val] = m
    rows = rows.filter(r => { const x = r[k]; if (op === 'eq') return String(x) === val; if (op === 'neq') return String(x) !== val; if (op === 'is') return val === 'null' ? x == null : String(x) === val; if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).includes(String(x)); if (op === 'gte') return x >= val; if (op === 'lte') return x <= val; if (op === 'gt') return x > val; return x < val })
  }
  return rows
}
function embutir(rows, select) {
  const re = /(\w+):(\w+)(?:!\w+)?\(([^()]*)\)/g; let m; const emb = []
  while ((m = re.exec(select || ''))) emb.push({ alias: m[1], tabela: m[2], cols: m[3].split(',').map(s => s.trim()) })
  return rows.map(r => { const o = { ...r }; for (const e of emb) { const fk = FK[e.alias]; const alvo = fk ? tabela(fk[0]).find(x => x.id === r[fk[1]]) : null; o[e.alias] = alvo ? (e.cols[0] === '*' ? alvo : Object.fromEntries(e.cols.map(c => [c, alvo[c]]))) : null } return o })
}
export function servidor(porta) {
  const s = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let corpo = ''
    req.on('data', d => { corpo += d }); req.on('end', () => {
      const json = (st, o, h = {}) => { res.writeHead(st, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(o)) }
      if (u.pathname.startsWith('/auth/v1/user')) return json(200, { id: 'staff-1', aud: 'authenticated', role: 'authenticated', email: 'lara@exemplo.com' })
      const m = u.pathname.match(/^\/rest\/v1\/(\w+)$/); if (!m) return json(404, { message: 'nope' })
      const nome = m[1]; const t = tabela(nome); const unico = (req.headers.accept || '').includes('vnd.pgrst.object')
      const prefer = req.headers.prefer || ''; const body = corpo ? JSON.parse(corpo) : null
      const devolve = rows => { const comEmb = embutir(rows, u.searchParams.get('select')); if (unico) return comEmb.length === 1 ? json(200, comEmb[0]) : json(406, { code: 'PGRST116', details: `${comEmb.length} rows`, message: 'JSON object requested, multiple (or no) rows returned' }); return json(200, comEmb) }
      if (req.method === 'GET') { let rows = filtros(u.searchParams, [...t]); const ord = u.searchParams.get('order'); if (ord) { const [c, dir] = ord.split(',')[0].split('.'); rows.sort((a, b) => (a[c] > b[c] ? 1 : -1) * (dir === 'desc' ? -1 : 1)) } const lim = u.searchParams.get('limit'); if (lim) rows = rows.slice(0, Number(lim)); return devolve(rows) }
      if (req.method === 'POST') {
        const lista = Array.isArray(body) ? body : [body]; const novas = []
        const conflito = u.searchParams.get('on_conflict')
        for (const l of lista) {
          if (conflito && prefer.includes('merge-duplicates')) { const cols = conflito.split(','); const ex = t.find(r => cols.every(c => String(r[c]) === String(l[c]))); if (ex) { Object.assign(ex, l); novas.push(ex); continue } }
          if (nome === 'formulario_envios' && t.some(r => r.token === l.token)) return json(409, { code: '23505', message: 'duplicate key' })
          if (nome === 'mensagens_whatsapp' && l.wa_message_id && t.some(r => r.wa_message_id === l.wa_message_id)) return json(409, { code: '23505', message: 'duplicate key' })
          const nova = { id: ++seq, created_at: new Date().toISOString(), ...l }; t.push(nova); novas.push(nova)
        }
        return prefer.includes('return=representation') ? devolve(novas) : json(201, null)
      }
      if (req.method === 'PATCH') { const rows = filtros(u.searchParams, [...t]); rows.forEach(r => Object.assign(r, body)); return prefer.includes('return=representation') ? devolve(rows) : json(204, null) }
      if (req.method === 'DELETE') { const rows = new Set(filtros(u.searchParams, [...t])); DB[nome] = t.filter(r => !rows.has(r)); return json(204, null) }
      json(405, {})
    })
  })
  return new Promise(ok => s.listen(porta, () => ok(s)))
}
