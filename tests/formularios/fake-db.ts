// Banco em memória com o subconjunto de PostgREST que o construtor usa (eq/neq/in/order/select com relação N:1).
export const db: Record<string, any[]> = {}
export const zerar = () => { for (const k of Object.keys(db)) delete db[k]; seq = 1 }
let seq = 1
// alias -> tabela (relação muitos-para-um pela coluna <alias>_id)
const FK: Record<string, string> = { pergunta: 'formulario_perguntas', formulario: 'formularios', contato: 'contatos', caso: 'casos' }
const CASCATA: Record<string, [string, string][]> = { formularios: [['formulario_secoes', 'formulario_id'], ['formulario_itens', 'formulario_id']] }

class Q {
  private filtros: ((r: any) => boolean)[] = []
  private ordens: string[] = []
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private conflito: string[] = []
  private payload: any
  private one: 'single' | 'maybe' | null = null
  private cols = '*'
  private ret = false
  private lim = 0
  constructor(private t: string) {}
  select(c = '*') { this.cols = c; this.ret = true; return this }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this }
  update(p: any) { this.op = 'update'; this.payload = p; return this }
  upsert(p: any, o?: { onConflict?: string }) { this.op = 'upsert'; this.payload = p; this.conflito = String(o?.onConflict ?? 'id').split(',').map(x => x.trim()); return this }
  delete() { this.op = 'delete'; return this }
  eq(k: string, v: any) { this.filtros.push(r => r[k] === v); return this }
  neq(k: string, v: any) { this.filtros.push(r => r[k] !== v); return this }
  in(k: string, vs: any[]) { this.filtros.push(r => vs.includes(r[k])); return this }
  ilike(k: string, pat: string) { const q = pat.replace(/%/g, '').toLowerCase(); this.filtros.push(r => String(r[k] ?? '').toLowerCase().includes(q)); return this }
  gte(k: string, v: any) { this.filtros.push(r => r[k] != null && r[k] >= v); return this }
  lte(k: string, v: any) { this.filtros.push(r => r[k] != null && r[k] <= v); return this }
  lt(k: string, v: any) { this.filtros.push(r => r[k] != null && r[k] < v); return this }
  is(k: string, v: any) { this.filtros.push(r => (r[k] ?? null) === v); return this }
  limit(n: number) { this.lim = n; return this }
  order(c: string) { this.ordens.push(c); return this }
  single() { this.one = 'single'; return this }
  maybeSingle() { this.one = 'maybe'; return this }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej) }
  private embed(r: any) {
    const out = { ...r }
    for (const m of this.cols.matchAll(/(\w+):(\w+)\(/g)) {
      const [, alias] = m
      const tabela = FK[alias!]
      if (tabela) out[alias!] = (db[tabela] ?? []).find(x => x.id === r[`${alias}_id`]) ?? null
    }
    return out
  }
  private run() {
    const tab = db[this.t] ?? (db[this.t] = [])
    let rows: any[]
    if (this.op === 'upsert') {
      rows = []
      for (const p of (Array.isArray(this.payload) ? this.payload : [this.payload])) {
        const ex = tab.find(r => this.conflito.every(c => r[c] === p[c]))
        if (ex) { Object.assign(ex, p); rows.push(ex) } else { const n = { id: seq++, created_at: new Date().toISOString(), ...p }; tab.push(n); rows.push(n) }
      }
    } else if (this.op === 'insert') {
      const novos = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(p => ({ id: seq++, created_at: new Date().toISOString(), ...(this.t === 'formulario_perguntas' ? { versao: 1, arquivada: false } : {}), ...(this.t === 'formularios' ? { ativo: true } : {}), ...(this.t === 'intimacoes' ? { status: 'a_tratar' } : {}), ...(this.t === 'compromissos' ? { status: 'pendente' } : {}), ...(this.t === 'tarefas_internas' ? { concluida: false } : {}), ...p }))
      tab.push(...novos); rows = novos
    } else if (this.op === 'delete') {
      rows = tab.filter(r => this.filtros.every(f => f(r)))
      db[this.t] = tab.filter(r => !rows.includes(r))
      for (const [t2, col] of CASCATA[this.t] ?? []) db[t2] = (db[t2] ?? []).filter(x => !rows.some(r => r.id === x[col]))
      if (this.t === 'formulario_secoes') for (const i of db.formulario_itens ?? []) if (rows.some(r => r.id === i.secao_id)) i.secao_id = null
    } else {
      rows = tab.filter(r => this.filtros.every(f => f(r)))
      if (this.op === 'update') {
        for (const r of rows) {
          // espelha o trigger guardar_versao_pergunta
          if (this.t === 'formulario_perguntas' && ['texto', 'tipo', 'ajuda'].some(k => k in this.payload && this.payload[k] !== r[k])) {
            (db.formulario_pergunta_versoes ??= []).push({ pergunta_id: r.id, versao: r.versao, texto: r.texto, tipo: r.tipo })
            r.versao++
          } else if (this.t === 'formulario_perguntas' && 'opcoes' in this.payload && JSON.stringify(this.payload.opcoes) !== JSON.stringify(r.opcoes)) {
            (db.formulario_pergunta_versoes ??= []).push({ pergunta_id: r.id, versao: r.versao, texto: r.texto, tipo: r.tipo })
            r.versao++
          }
          Object.assign(r, this.payload)
        }
      }
    }
    if (this.ordens.length) rows = [...rows].sort((a, b) => { for (const c of this.ordens) { if (a[c] !== b[c]) return (a[c] ?? 0) < (b[c] ?? 0) ? -1 : 1 } return 0 })
    if (this.lim) rows = rows.slice(0, this.lim)
    rows = rows.map(r => this.embed(r))
    if (this.one) {
      if (rows.length !== 1 && this.one === 'single') return { data: null, error: { message: 'not single' } }
      return { data: rows[0] ?? null, error: null }
    }
    return { data: this.op === 'select' || this.ret ? rows : null, error: null }
  }
}
export const banco = { from: (t: string) => new Q(t) }
