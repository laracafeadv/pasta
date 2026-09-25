export const brl = (v: number | string | null | undefined) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const dataCurta = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''

export const dataHora = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

/** "hoje", "amanhã", "há 3 dias", "em 5 dias" */
export function diaRelativo(iso: string | null | undefined) {
  if (!iso) return ''
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
  const d = new Date(iso + 'T12:00:00')
  const diff = Math.round((d.getTime() - hoje.getTime()) / 864e5)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  return diff < 0 ? `há ${-diff} dias` : `em ${diff} dias`
}

/** Exibe 5511999998888 como +55 (11) 99999-8888 */
export function telefoneFormatado(t: string | null | undefined) {
  const d = String(t ?? '').replace(/\D/g, '')
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : d
}

export const whatsappLink = (t: string | null | undefined) => {
  const d = String(t ?? '').replace(/\D/g, '')
  return d ? `https://wa.me/${d}` : ''
}
