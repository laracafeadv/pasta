// Stub de '#supabase/server' para rodar as regras do ciclo fora do Nuxt, sobre um banco em memória.
export const db: Record<string, any[]> = { contatos: [], casos: [], honorarios: [], atividades: [] }
let seq = 1
class Q {
  private filtros: ((r: any) => boolean)[] = []
  private op: 'select' | 'insert' | 'update' = 'select'
  private payload: any
  private one: 'single' | 'maybe' | null = null
  private ret = false
  constructor(private t: string) {}
  select() { this.ret = true; return this }
  insert(p: any) { this.op = 'insert'; this.payload = p; return this }
  update(p: any) { this.op = 'update'; this.payload = p; return this }
  eq(k: string, v: any) { this.filtros.push(r => r[k] === v); return this }
  neq(k: string, v: any) { this.filtros.push(r => r[k] !== v); return this }
  order() { return this }
  limit() { return this }
  single() { this.one = 'single'; return this }
  maybeSingle() { this.one = 'maybe'; return this }
  then(res: any, rej: any) { return Promise.resolve(this.run()).then(res, rej) }
  private run() {
    const tab = db[this.t] ?? (db[this.t] = [])
    let rows: any[]
    if (this.op === 'insert') {
      const novos = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(p => ({ id: seq++, created_at: new Date().toISOString(), ...p }))
      tab.push(...novos); rows = novos
    } else {
      rows = tab.filter(r => this.filtros.every(f => f(r)))
      if (this.op === 'update') rows.forEach(r => Object.assign(r, this.payload))
    }
    if (this.one) {
      if (rows.length !== 1 && this.one === 'single') return { data: null, error: { message: 'not single' } }
      return { data: rows[0] ?? null, error: null }
    }
    return { data: this.op === 'select' || this.ret ? rows : null, error: null }
  }
}
export const banco = { from: (t: string) => new Q(t) }
export const serverSupabaseServiceRole = () => banco
