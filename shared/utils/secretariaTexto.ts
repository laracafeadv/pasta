import { addDays, dow } from './calendarioForense'

/**
 * Interpreta, sem IA e sem rede, o que a advogada escreve no campo "O que você precisa?".
 * Entende: tipo (prazo, audiência, consulta, reunião/compromisso, tarefa, lembrete), datas relativas (hoje, amanhã, depois de amanhã,
 * dia da semana, "dia 15", 15/10, daqui a N dias), hora (10h, 10h30, 14:00, às 9) e dias de prazo (15 dias úteis).
 * O resultado é sempre uma PROPOSTA: a tela mostra o que foi entendido e a pessoa confirma ou corrige antes de criar.
 */
export type TipoSecretaria = 'lembrete' | 'prazo' | 'audiencia' | 'consulta' | 'compromisso' | 'tarefa'
export interface PropostaSecretaria { tipo: TipoSecretaria; titulo: string; data: string; hora: string; dias: number | null; inicio: string; entendeu: string[] }

const SEMANA: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 }
const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pad = (n: number) => String(n).padStart(2, '0')
const valida = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d }

/** Acha uma data no texto. Devolve a data ISO e o trecho consumido. */
function acharData(t: string, hoje: string, passado = false): { iso: string; trecho: string } | null {
  const y0 = Number(hoje.slice(0, 4))
  let m: RegExpMatchArray | null
  if ((m = t.match(/\bdepois de amanha\b/))) return { iso: addDays(hoje, 2), trecho: m[0] }
  if ((m = t.match(/\bamanha\b/))) return { iso: addDays(hoje, 1), trecho: m[0] }
  if ((m = t.match(/\banteontem\b/))) return { iso: addDays(hoje, -2), trecho: m[0] }
  if ((m = t.match(/\bontem\b/))) return { iso: addDays(hoje, -1), trecho: m[0] }
  if ((m = t.match(/\bhoje\b/))) return { iso: hoje, trecho: m[0] }
  if ((m = t.match(/\bdaqui a (\d{1,3}) dias?\b/))) return { iso: addDays(hoje, Number(m[1])), trecho: m[0] }
  if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const d = Number(m[1]), mes = Number(m[2]); let y = m[3] ? Number(m[3]) : y0; if (y < 100) y += 2000
    if (valida(y, mes, d)) { let iso = `${y}-${pad(mes)}-${pad(d)}`; if (!passado && !m[3] && iso < hoje) iso = `${y + 1}-${pad(mes)}-${pad(d)}`; return { iso, trecho: m[0] } }
  }
  if ((m = t.match(/\bdia (\d{1,2})\b(?! de prazo)/))) {
    const d = Number(m[1]); let y = y0, mes = Number(hoje.slice(5, 7))
    if (d >= 1 && d <= 31) {
      let iso = valida(y, mes, d) ? `${y}-${pad(mes)}-${pad(d)}` : ''
      if (!iso || (!passado && iso < hoje)) { mes++; if (mes > 12) { mes = 1; y++ } iso = valida(y, mes, d) ? `${y}-${pad(mes)}-${pad(d)}` : '' }
      if (iso) return { iso, trecho: m[0] }
    }
  }
  if ((m = t.match(/\b(segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:-feira)?(?: que vem| proxima| proximo)?\b/))) {
    const alvo = SEMANA[m[1]!]!; let delta = (alvo - dow(hoje) + 7) % 7; if (delta === 0) delta = 7
    return { iso: addDays(hoje, delta), trecho: m[0] }
  }
  return null
}

function acharHora(t: string): { hora: string; trecho: string } | null {
  let m = t.match(/\b(?:as |a |por volta das )?(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b(?:\s*h)?/)
  if (m && Number(m[1]) <= 23 && (!m[2] || Number(m[2]) <= 59)) return { hora: `${pad(Number(m[1]))}:${m[2] ?? '00'}`, trecho: m[0] }
  m = t.match(/\bas (\d{1,2})\b(?! dias)/)
  if (m && Number(m[1]) <= 23) return { hora: `${pad(Number(m[1]))}:00`, trecho: m[0] }
  return null
}

export function interpretarTexto(texto: string, hoje: string): PropostaSecretaria {
  const original = String(texto ?? '').trim().slice(0, 400)
  const t = sem(original)
  const entendeu: string[] = []
  let tipo: TipoSecretaria = 'lembrete'
  if (/\bprazo\b/.test(t)) tipo = 'prazo'
  else if (/\baudiencia\b/.test(t)) tipo = 'audiencia'
  else if (/\bconsulta\b/.test(t)) tipo = 'consulta'
  else if (/\b(reuniao|compromisso)\b/.test(t)) tipo = 'compromisso'
  else if (/\btarefa\b/.test(t) && !/lembr/.test(t)) tipo = 'tarefa'

  let restante = original
  const corta = (trechoSem: string) => {
    // remove do texto original o trecho achado no texto sem acento (mesmo comprimento)
    const i = t.indexOf(trechoSem); if (i >= 0) restante = restante.slice(0, i) + ' '.repeat(trechoSem.length) + restante.slice(i + trechoSem.length)
  }
  let dias: number | null = null, inicio = hoje, data = '', hora = ''
  if (tipo === 'prazo') {
    const md = t.match(/\b(\d{1,3})\s*(?:dias?|d)\b(?:\s*uteis)?/)
    if (md) { dias = Math.min(Number(md[1]), 365); corta(md[0]); entendeu.push(`${dias} dias úteis`) }
    const mi = t.match(/\b(?:intimad[oa]s?|publicad[oa]s?|citad[oa]s?|ciencia|notificad[oa]s?)\b[^,.;]*/)
    if (mi) {
      const d = acharData(mi[0], hoje, true)
      if (d) { inicio = d.iso; entendeu.push('contagem a partir de ' + d.iso.split('-').reverse().join('/')); corta(mi[0]) }
      else corta(mi[0])
    }
  } else {
    const d = acharData(t, hoje)
    if (d) { data = d.iso; corta(d.trecho) }
    const h = acharHora(sem(restante))
    if (h) { hora = h.hora; corta(h.trecho) }
  }
  // título: tira o verbo/forma inicial e conectivos soltos
  let titulo = restante
    .replace(/\b(me\s+)?lembr(a|e|ar|ete)\b( de| que| para)?/gi, ' ')
    .replace(/\b(agendar|marcar|anotar|criar|colocar|cadastrar)\b/gi, ' ')
    .replace(/\b(um|uma)\s+(prazo|audi[eê]ncia|consulta|reuni[aã]o|tarefa)\b/gi, ' ')
    .replace(/\bprazo\b( de| para)?/gi, ' ')
    .replace(/^\s*tarefa\b[:\s-]*/i, ' ')
    .replace(/\s+/g, ' ').replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .replace(/^(de|para|que|sobre|com|na|no|em|a|o)\s+/i, '')
    .replace(/\s*,\s*$/, '')
  if (!titulo) titulo = tipo === 'prazo' ? 'Prazo' : tipo === 'audiencia' ? 'Audiência' : tipo === 'consulta' ? 'Consulta' : tipo === 'compromisso' ? 'Compromisso' : original
  titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1)
  if (data) entendeu.push('data ' + data.split('-').reverse().join('/'))
  if (hora) entendeu.push('às ' + hora)
  return { tipo, titulo: titulo.slice(0, 200), data, hora, dias, inicio, entendeu }
}
