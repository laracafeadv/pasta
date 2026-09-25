import { serverSupabaseClient } from '#supabase/server'
import { ETAPAS } from '../../../shared/types/crm'
import { requireStaff } from '../../utils/security'
import { hojeBR } from '../../utils/crm'

const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null)
const dias = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5))

/** Indicadores de qualidade do escritório. */
export default defineEventHandler(async (event) => {
  await requireStaff(event, 'qualidade/kpis')
  const client = await serverSupabaseClient(event)
  const hoje = hojeBR()
  const desde90 = new Date(Date.now() - 90 * 864e5).toISOString()

  const [{ data: casos }, { data: prazos }, { data: nps }, { data: revisoes }, { data: consultas }] = await Promise.all([
    client.from('casos').select('status, data_abertura, data_encerramento, resultado').limit(5000),
    client.from('compromissos').select('data_limite, status, concluido_em, responsavel_id').eq('tipo', 'prazo').limit(5000),
    client.from('contatos').select('nps').not('nps', 'is', null).limit(5000),
    client.from('revisoes').select('aprovado, created_at').gte('created_at', desde90).limit(1000),
    client.from('contatos').select('created_at, consulta_em').not('consulta_em', 'is', null).gte('created_at', desde90).limit(2000),
  ])

  const encerrados = (casos ?? []).filter(c => c.status === 'encerrado' && c.data_encerramento)
  const comResultado = encerrados.filter(c => c.resultado)
  const positivos = comResultado.filter(c => ['exito', 'acordo', 'parcial'].includes(c.resultado!))
  const P = prazos ?? []
  const concluidosPrazo = P.filter(p => p.status === 'concluido' && p.data_limite && p.concluido_em)
  const noPrazo = concluidosPrazo.filter(p => p.concluido_em!.slice(0, 10) <= p.data_limite!)
  const notas = (nps ?? []).map(n => Number(n.nps))
  const R = revisoes ?? []


  return {
    tempoMedioSolucao: media(encerrados.map(c => dias(c.data_abertura, c.data_encerramento!))),
    encerrados: encerrados.length,
    taxaExito: comResultado.length ? Math.round((positivos.length / comResultado.length) * 100) : null,
    resultados: comResultado.reduce<Record<string, number>>((acc, c) => { acc[c.resultado!] = (acc[c.resultado!] ?? 0) + 1; return acc }, {}),
    nps: notas.length ? Math.round(((notas.filter(n => n >= 9).length - notas.filter(n => n <= 6).length) / notas.length) * 100) : null,
    respostasNps: notas.length,
    prazosNoPrazo: concluidosPrazo.length ? Math.round((noPrazo.length / concluidosPrazo.length) * 100) : null,
    prazosVencidos: P.filter(p => p.status === 'pendente' && p.data_limite && p.data_limite < hoje).length,
    diasAteConsulta: media((consultas ?? []).map(c => dias(c.created_at, c.consulta_em!))),
    revisoes90: R.length,
    revisoesAprovadas: R.length ? Math.round((R.filter(r => r.aprovado).length / R.length) * 100) : null,
    etapasAbertas: ETAPAS.filter(e => e.aberta).length,
  }
})
