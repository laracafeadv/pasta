/** Valor em reais por extenso (ex.: 350 → "trezentos e cinquenta reais"), até 999 milhões. */
const UNIDADES = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number): string {
  if (n === 100) return 'cem'
  const partes: string[] = []
  const c = Math.floor(n / 100)
  const r = n % 100
  if (c) partes.push(CENTENAS[c]!)
  if (r > 0 && r < 20) partes.push(UNIDADES[r]!)
  else if (r >= 20) partes.push(r % 10 ? `${DEZENAS[Math.floor(r / 10)]} e ${UNIDADES[r % 10]}` : DEZENAS[Math.floor(r / 10)]!)
  return partes.join(' e ')
}

function inteiro(n: number): string {
  if (n === 0) return 'zero'
  const grupos: [number, string][] = [
    [Math.floor(n / 1e6) % 1000, 'milhao'],
    [Math.floor(n / 1000) % 1000, 'mil'],
    [n % 1000, ''],
  ]
  const partes: { texto: string; valor: number }[] = []
  for (const [v, tipo] of grupos) {
    if (!v) continue
    if (tipo === 'milhao') partes.push({ texto: v === 1 ? 'um milhão' : `${ate999(v)} milhões`, valor: v })
    else if (tipo === 'mil') partes.push({ texto: v === 1 ? 'mil' : `${ate999(v)} mil`, valor: v })
    else partes.push({ texto: ate999(v), valor: v })
  }
  // "mil e duzentos", "mil duzentos e trinta": o "e" só liga o último grupo se ele for < 100 ou centena redonda.
  return partes.reduce((acc, p, i) => {
    if (i === 0) return p.texto
    const ultimo = i === partes.length - 1
    return `${acc}${ultimo && (p.valor < 100 || p.valor % 100 === 0) ? ' e ' : ' '}${p.texto}`
  }, '')
}

export function valorPorExtenso(valor: number | string | null | undefined): string {
  const v = typeof valor === 'string' ? Number(valor.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.')) : Number(valor)
  if (!Number.isFinite(v) || v < 0 || v >= 1e9) return ''
  const reais = Math.floor(v + 1e-9)
  const centavos = Math.round((v - reais) * 100)
  const textoReais = reais
    ? `${inteiro(reais)}${reais % 1e6 === 0 ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`
    : ''
  const textoCentavos = centavos ? `${ate999(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : ''
  return [textoReais, textoCentavos].filter(Boolean).join(' e ') || 'zero real'
}
