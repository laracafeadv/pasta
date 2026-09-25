/**
 * Regras jurídicas usadas no servidor e nas telas.
 */

/**
 * Número único de processo (Res. CNJ 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO,
 * com dígito verificador pelo módulo 97 (ISO 7064). Portado do plataforma-adv.
 */
export function numeroCnjValido(numero: string): boolean {
  const m = numero.trim().match(/^(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})$/)
  if (!m) return false
  const [, seq, dv, ano, j, tr, origem] = m
  const base = BigInt(`${seq}${ano}${j}${tr}${origem}00`)
  const calculado = 98n - (base % 97n)
  return calculado === BigInt(dv!)
}

export function formatarCnj(numero: string): string {
  const d = numero.replace(/\D/g, '')
  if (d.length !== 20) return numero.trim()
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`
}

// ─── Prazos em dias úteis (CPC, arts. 219, 220 e 224) ──────────────────────

const iso = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
const addDias = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(ano, mes - 1, dia))
}

/** Feriados nacionais e dias sem expediente forense em todo o país. */
export function feriadosNacionais(ano: number): Map<string, string> {
  const f = new Map<string, string>()
  const fixo = (m: number, d: number, nome: string) => f.set(`${ano}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, nome)
  fixo(1, 1, 'Confraternização Universal')
  fixo(4, 21, 'Tiradentes')
  fixo(5, 1, 'Dia do Trabalho')
  fixo(9, 7, 'Independência')
  fixo(10, 12, 'Nossa Senhora Aparecida')
  fixo(11, 2, 'Finados')
  fixo(11, 15, 'Proclamação da República')
  fixo(11, 20, 'Dia da Consciência Negra')
  fixo(12, 25, 'Natal')
  // Sexta-feira Santa é tratada como feriado em todo o Judiciário.
  f.set(iso(addDias(pascoa(ano), -2)), 'Sexta-feira Santa')
  return f
}

/**
 * Datas em que MUITOS tribunais suspendem o expediente, mas que não são feriado
 * nacional por lei. O cálculo as conta como dias úteis (prazo mais curto =
 * mais seguro) e avisa para conferir no tribunal.
 */
export function datasDeAtencao(ano: number): Map<string, string> {
  const p = pascoa(ano)
  return new Map([
    [iso(addDias(p, -48)), 'Carnaval (segunda)'],
    [iso(addDias(p, -47)), 'Carnaval (terça)'],
    [iso(addDias(p, -46)), 'Quarta-feira de Cinzas'],
    [iso(addDias(p, -3)), 'Quinta-feira Santa'],
    [iso(addDias(p, 60)), 'Corpus Christi'],
  ])
}

/** Recesso forense: 20/12 a 20/01, prazos suspensos (CPC, art. 220). */
function emRecesso(d: Date) {
  const m = d.getUTCMonth() + 1, dia = d.getUTCDate()
  return (m === 12 && dia >= 20) || (m === 1 && dia <= 20)
}

export function diaUtilForense(d: Date, cache = new Map<number, Map<string, string>>()): boolean {
  const semana = d.getUTCDay()
  if (semana === 0 || semana === 6) return false
  if (emRecesso(d)) return false
  const ano = d.getUTCFullYear()
  if (!cache.has(ano)) cache.set(ano, feriadosNacionais(ano))
  return !cache.get(ano)!.has(iso(d))
}

/**
 * Prazo processual em dias úteis a partir da data de publicação/intimação.
 * Exclui o dia do começo e inclui o do vencimento (art. 224): a contagem
 * começa no primeiro dia útil seguinte. Não considera feriados estaduais,
 * municipais nem suspensões do tribunal: a tela avisa para conferir.
 */
export function calcularPrazo(dataPublicacao: string, dias: number): { vencimento: string; ignorados: string[]; conferir: string[] } {
  const cache = new Map<number, Map<string, string>>()
  let d = new Date(dataPublicacao + 'T00:00:00Z')
  const ignorados: string[] = []
  const conferir: string[] = []
  let contados = 0
  while (contados < dias) {
    d = addDias(d, 1)
    const atencao = datasDeAtencao(d.getUTCFullYear()).get(iso(d))
    if (atencao && diaUtilForense(d, cache) && !conferir.includes(atencao)) conferir.push(atencao)
    if (diaUtilForense(d, cache)) contados++
    else {
      const nome = cache.get(d.getUTCFullYear())?.get(iso(d)) ?? (emRecesso(d) ? 'recesso forense' : null)
      if (nome && !ignorados.includes(nome)) ignorados.push(nome)
    }
  }
  return { vencimento: iso(d), ignorados, conferir }
}

// ─── Máscara de dados confidenciais (padrão do governo: ***.456.789-**) ────
export function mascararDocumento(v: string | null | undefined): string | null {
  const d = String(v ?? '').replace(/\D/g, '')
  if (!d) return v ? '***' : null
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
  return '*'.repeat(Math.max(d.length - 2, 1)) + d.slice(-2)
}

export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (n: number) => {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
