/**
 * Calendário forense para contagem de prazo em dias úteis (CPC, arts. 219, 220 e 224).
 * Soma ao que é nacional (feriados, Sexta-feira Santa, recesso de 20/12 a 20/01) os dias sem expediente de cada tribunal
 * (TJBA, TRT5, Justiça Federal/SJBA), os feriados municipais de Salvador e as suspensões anotadas pela equipe.
 *
 * ATENÇÃO sobre as fontes: os decretos dos tribunais não puderam ser abertos (acesso bloqueado na época da montagem).
 * Cada data traz a `fonte`: lei · regra (regra geral do calendário forense) · resumo (consta em resumo de página oficial;
 * conferir no documento) · confirmar. Pontos facultativos NÃO são descontados por padrão (prazo mais curto = mais seguro).
 */
export interface FeriadoForense { d: string; nome: string; esc: string[]; tipo: 'feriado' | 'facultativo'; fonte: 'lei' | 'regra' | 'resumo' | 'confirmar'; nota?: string }
export interface ContextoPrazo { trib: string; ssa: boolean; fac: boolean; susp?: { de: string; ate: string; trib: string; motivo?: string | null }[] }
const pad = (n: number) =>  String(n).padStart(2, '0')
const isoOf = (y: number, m: number, d: number) => y + '-' + pad(m) + '-' + pad(d)
const utc = (iso: string) => { const [y, m, d] = iso.split('-').map(Number) as [number, number, number]; return Date.UTC(y, m - 1, d) }
export const addDays = (iso: string, n: number) => { const t = new Date(utc(iso) + n * 864e5); return isoOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()) }
export const dow = (iso: string) => new Date(utc(iso)).getUTCDay()
export function pascoa(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  return isoOf(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1)
}
export const TRIBUNAIS: Record<string, string> = { tjba: 'TJBA (Justiça estadual)', trt5: 'TRT5 (Justiça do Trabalho)', jf: 'Justiça Federal (SJBA)', nac: 'Só feriados nacionais' }
// fonte: lei = lei federal/estadual · regra = regra geral de calendário forense · resumo = consta em resumo de página oficial (PDF não aberto) · confirmar = sem confirmação
const ANO2026: FeriadoForense[] = [
  { d: '2026-02-12', nome: 'Ponto facultativo pré-Carnaval', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-02-13', nome: 'Ponto facultativo pré-Carnaval', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-04-20', nome: 'Ponto facultativo (Tiradentes)', esc: ['tjba', 'jf'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-04-20', nome: 'Ponto facultativo com suspensão de prazos', esc: ['trt5'], tipo: 'feriado', fonte: 'resumo' },
  { d: '2026-06-05', nome: 'Ponto facultativo (pós-Corpus Christi)', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-06-05', nome: 'Ponto facultativo com suspensão de prazos', esc: ['trt5'], tipo: 'feriado', fonte: 'resumo' },
  { d: '2026-06-22', nome: 'Ponto facultativo (São João)', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-06-23', nome: 'Ponto facultativo (São João)', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-07-03', nome: 'Ponto facultativo (pós-2 de Julho)', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-07-03', nome: 'Ponto facultativo com suspensão de prazos', esc: ['trt5'], tipo: 'feriado', fonte: 'resumo' },
  { d: '2026-08-10', nome: 'Ponto facultativo', esc: ['tjba'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-08-10', nome: 'Ponto facultativo com suspensão de prazos', esc: ['trt5'], tipo: 'feriado', fonte: 'resumo' },
  { d: '2026-10-30', nome: 'Dia do Servidor Público (transferido de 28/10)', esc: ['trt5'], tipo: 'feriado', fonte: 'resumo' },
  { d: '2026-12-07', nome: 'Ponto facultativo (véspera do Dia da Justiça)', esc: ['tjba', 'jf'], tipo: 'facultativo', fonte: 'resumo' },
  { d: '2026-12-07', nome: 'Ponto facultativo com suspensão de prazos', esc: ['trt5'], tipo: 'feriado', fonte: 'resumo' },
]
function feriadosAno(y: number): FeriadoForense[] {
  const P = pascoa(y), L: FeriadoForense[] = []
  const add = (d: string, nome: string, esc: string[], tipo: FeriadoForense['tipo'], fonte: FeriadoForense['fonte'], nota?: string) => L.push({ d, nome, esc, tipo, fonte, nota })
  add(isoOf(y, 1, 1), 'Confraternização Universal', ['all'], 'feriado', 'lei')
  add(isoOf(y, 4, 21), 'Tiradentes', ['all'], 'feriado', 'lei')
  add(isoOf(y, 5, 1), 'Dia do Trabalho', ['all'], 'feriado', 'lei')
  add(isoOf(y, 7, 2), 'Independência da Bahia', ['all'], 'feriado', 'lei', 'Feriado estadual')
  add(isoOf(y, 9, 7), 'Independência do Brasil', ['all'], 'feriado', 'lei')
  add(isoOf(y, 10, 12), 'Nossa Senhora Aparecida', ['all'], 'feriado', 'lei')
  add(isoOf(y, 11, 2), 'Finados', ['all'], 'feriado', 'lei')
  add(isoOf(y, 11, 15), 'Proclamação da República', ['all'], 'feriado', 'lei')
  add(isoOf(y, 11, 20), 'Consciência Negra', ['all'], 'feriado', 'lei')
  add(isoOf(y, 12, 25), 'Natal', ['all'], 'feriado', 'lei')
  add(addDays(P, -2), 'Sexta-feira Santa', ['all'], 'feriado', 'lei')
  for (const t of ['tjba', 'trt5', 'jf']) {
    add(addDays(P, -48), 'Carnaval (segunda)', [t], 'feriado', y === 2026 ? 'resumo' : 'regra')
    add(addDays(P, -47), 'Carnaval (terça)', [t], 'feriado', y === 2026 ? 'resumo' : 'regra')
    add(addDays(P, -46), 'Quarta-feira de Cinzas (expediente a partir das 14h)', [t], 'facultativo', y === 2026 ? 'resumo' : 'regra')
    add(addDays(P, -4), 'Semana Santa (quarta)', [t], 'feriado', 'regra', 'Lei 5.010/1966, art. 62')
    add(addDays(P, -3), 'Semana Santa (quinta)', [t], 'feriado', y === 2026 ? 'resumo' : 'regra', 'Lei 5.010/1966, art. 62')
    add(isoOf(y, 12, 8), 'Dia da Justiça', [t], 'feriado', 'regra')
  }
  add(addDays(P, 60), 'Corpus Christi', ['ssa'], 'feriado', 'resumo', 'Feriado municipal em Salvador')
  add(isoOf(y, 6, 24), 'São João', ['ssa'], 'feriado', 'resumo', 'Feriado municipal em Salvador')
  add(isoOf(y, 12, 8), 'Nossa Senhora da Conceição da Praia', ['ssa'], 'feriado', 'resumo', 'Feriado municipal em Salvador')
  if (y === 2026) for (const e of ANO2026) L.push(e)
  return L
}
const _cache: Record<number, FeriadoForense[]> = {}
export const feriadosDe = (y: number) => _cache[y] || (_cache[y] = feriadosAno(y))
export function motivoNaoUtil(iso: string, ctx: ContextoPrazo): string | null {
  const w = dow(iso)
  if (w === 0) return 'Domingo'
  if (w === 6) return 'Sábado'
  const md = iso.slice(5)
  if ((md >= '12-20') || (md <= '01-20')) return 'Recesso forense (20/12 a 20/01)'
  for (const f of feriadosDe(Number(iso.slice(0, 4)))) {
    if (f.d !== iso) continue
    const vale = f.esc.includes('all') || f.esc.includes(ctx.trib) || (f.esc.includes('ssa') && ctx.ssa)
    if (!vale) continue
    if (f.tipo === 'feriado' || ctx.fac) return f.nome
  }
  for (const s of ctx.susp || []) if (iso >= s.de && iso <= s.ate && (s.trib === 'todos' || s.trib === ctx.trib)) return 'Suspensão anotada: ' + (s.motivo || 'sem motivo')
  return null
}
export function contarPrazo(inicio: string, dias: number, ctx: ContextoPrazo): { vencimento: string; pulados: { d: string; motivo: string }[] } {
  let cur = inicio, n = 0; const pulados: { d: string; motivo: string }[] = []
  while (n < dias) {
    cur = addDays(cur, 1)
    const m = motivoNaoUtil(cur, ctx)
    if (m) { if (dow(cur) !== 0 && dow(cur) !== 6) pulados.push({ d: cur, motivo: m }) } else n++
    if (cur > addDays(inicio, 800)) break
  }
  return { vencimento: cur, pulados }
}

export const NAO_CONFIRMADO = [
  'Não foi possível abrir os documentos oficiais (TJBA Decreto Judiciário 1050/2025, TRT5 RA 037/2025, Portaria SJBA-DIREF 30/2026). Usei só resumos oficiais. Confira cada data no documento do tribunal.',
  'TJBA: não confirmei se cada ponto facultativo de 2026 (12/02, 13/02, 20/04, 05/06, 22/06, 23/06, 03/07, 10/08 e 07/12) suspende os prazos. Por segurança eles não são descontados; a tela mostra a data alternativa quando fizerem diferença.',
  'Justiça Federal (SJBA): não confirmei se 20/04 e 07/12 (pontos facultativos) suspendem prazos, nem se 28/10 (Dia do Servidor) conta como dia sem expediente.',
  'Salvador: 04/12 (Santa Bárbara) e 29/03 (aniversário da cidade) não apareceram como feriado nas fontes. Consta em resumo só 24/06, 08/12 e Corpus Christi; Sexta-feira Santa e 2 de Julho são nacional/estadual.',
  'Anos diferentes de 2026: entram feriados nacionais, Carnaval, Semana Santa, Dia da Justiça e datas municipais por regra geral. Os pontos facultativos de 2027 ainda não foram publicados: anote as suspensões quando saírem.',
  'Quarta-feira de Cinzas (expediente a partir das 14h) é tratada como ponto facultativo, não como dia suspenso.',
]
