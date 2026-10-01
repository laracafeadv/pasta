import { db, banco } from './stub-supabase'
import { validarTransicao, demandasAbertas, resolverDemandaComercial, encerrarSemContratacao, sincronizarCicloPorHonorario } from '../../server/utils/ciclo'
import { sincronizarClienteComDemandas } from '../../server/utils/demandas'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
const ev = {} as any
let falhas = 0
const ok = (cond: boolean, nome: string) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${nome}`); if (!cond) falhas++ }
const lanca = async (fn: () => any) => { try { await fn(); return false } catch { return true } }
const pessoa = async (etapa: string, extra: any = {}) => (await banco.from('contatos').insert({ nome: 'Teste', telefone: String(Math.random()), etapa, ...extra }).select().single()).data
const demanda = async (contato_id: number, status = 'ativo') => (await banco.from('casos').insert({ contato_id, titulo: 'D' + Math.random(), status }).select().single()).data
const hon = async (contato_id: number, caso_id: number | null, status: string, tipo = 'Contrato fixo') => (await banco.from('honorarios').insert({ contato_id, caso_id, status, tipo, valor: 100 }).select().single()).data
const get = async (id: number) => (await banco.from('contatos').select().eq('id', id).single()).data

// Cenário A — pessoa nova → lead → consulta → demanda → contratação (mesma pessoa, sem duplicar)
{
  const p = await pessoa('novo'); const antes = db.contatos.length
  validarTransicao('novo', 'qualificacao', 0); validarTransicao('qualificacao', 'agendado', 0); validarTransicao('agendado', 'diagnostico', 0)
  ok(await lanca(() => validarTransicao('novo', 'concluido', 0)), 'A1 lead não pode ser "concluído" sem contratar')
  const d = await demanda(p.id)
  const casoId = await resolverDemandaComercial(ev, banco, p, null, null)
  ok(casoId === d.id, 'A2 proposta/contrato usa a única demanda aberta (não cria outra)')
  const h1 = await hon(p.id, casoId, 'Proposta'); await sincronizarCicloPorHonorario(ev, banco, h1, null)
  ok((await get(p.id)).etapa === 'proposta', 'A3 proposta registrada leva o lead a "Proposta enviada"')
  const h2 = await hon(p.id, casoId, 'Contratado'); await sincronizarCicloPorHonorario(ev, banco, h2, null)
  const c = await get(p.id)
  ok(c.etapa === 'ativo' && c.proxima_acao, 'A4 contratação vira cliente ativo, com próxima ação')
  ok(db.contatos.length === antes && db.casos.filter(x => x.contato_id === p.id).length === 1, 'A5 mesma pessoa e uma só demanda (sem duplicar)')
  // lead sem nenhuma demanda: contratar abre a demanda
  const q = await pessoa('diagnostico')
  const novoId = await resolverDemandaComercial(ev, banco, { ...q, demanda: 'Divórcio consensual' }, null, null)
  ok(db.casos.some(x => x.id === novoId && x.contato_id === q.id && x.titulo === 'Divórcio consensual'), 'A6 sem demanda: contratação abre a demanda automaticamente')
}
// Cenário B — cliente existente → nova demanda → nova proposta (sem voltar ao funil)
{
  const p = await pessoa('ativo'); const d1 = await demanda(p.id); await hon(p.id, d1.id, 'Contratado')
  const d2 = await demanda(p.id); await sincronizarClienteComDemandas(ev, banco, p.id, null)
  ok(await lanca(() => resolverDemandaComercial(ev, banco, p, null, null)), 'B1 com 2 demandas abertas exige escolher a demanda da proposta')
  ok(await resolverDemandaComercial(ev, banco, p, d2.id, null) === d2.id, 'B2 proposta da nova demanda ligada a ela')
  ok(await lanca(() => resolverDemandaComercial(ev, banco, p, 999999, null)), 'B3 demanda de outra pessoa/inexistente rejeitada')
  const h = await hon(p.id, d2.id, 'Proposta'); await sincronizarCicloPorHonorario(ev, banco, h, null)
  ok((await get(p.id)).etapa === 'ativo', 'B4 nova proposta NÃO devolve o cliente ao funil')
  ok(await lanca(() => validarTransicao('ativo', 'proposta', 2)) && await lanca(() => validarTransicao('ativo', 'novo', 2)) && await lanca(() => validarTransicao('ativo', 'perdido', 2)), 'B5 cliente não volta a lead nem vira "não contratou"')
  const hs = db.honorarios.filter(x => x.contato_id === p.id)
  ok(hs.find(x => x.caso_id === d1.id)?.status === 'Contratado' && hs.find(x => x.caso_id === d2.id)?.status === 'Proposta', 'B6 cada demanda tem o seu honorário/situação')
}
// Cenário C — todas as demandas encerradas → concluído → nova demanda depois
{
  const p = await pessoa('ativo'); const d1 = await demanda(p.id)
  ok(await lanca(() => validarTransicao('ativo', 'concluido', 1)), 'C1 não conclui cliente com demanda em andamento')
  d1.status = 'encerrado'; await sincronizarClienteComDemandas(ev, banco, p.id, null)
  ok((await get(p.id)).etapa === 'concluido', 'C2 última demanda encerrada → cliente concluído (segue cadastrado)')
  ok(await lanca(() => validarTransicao('concluido', 'ativo', 0)) && await lanca(() => validarTransicao('concluido', 'novo', 0)), 'C3 concluído não reativa nem volta ao funil sem demanda nova')
  const d2 = await demanda(p.id); await sincronizarClienteComDemandas(ev, banco, p.id, null)
  ok((await get(p.id)).etapa === 'ativo' && (await demandasAbertas(banco, p.id)).length === 1, 'C4 nova demanda depois → volta a ativo (mesma pessoa)')
  const h = await hon(p.id, d2.id, 'Contratado'); await sincronizarCicloPorHonorario(ev, banco, h, null)
  ok((await get(p.id)).etapa === 'ativo' && db.contatos.filter(x => x.id === p.id).length === 1, 'C5 contratar a nova demanda mantém o cliente ativo, sem duplicar')
}
// Cenário D — consultou e não contratou; depois contrata (sem cliente duplicado)
{
  const p = await pessoa('diagnostico'); const d = await demanda(p.id); const h = await hon(p.id, d.id, 'Proposta')
  await banco.from('contatos').update({ etapa: 'perdido' }).eq('id', p.id); await encerrarSemContratacao(ev, banco, p.id, null)
  ok(h.status === 'Cancelado' && d.status === 'encerrado' && d.resultado === 'desistencia', 'D1 não contratou: proposta cancelada e demanda encerrada (nada apagado)')
  ok(db.contatos.filter(x => x.id === p.id).length === 1 && !!db.honorarios.find(x => x.id === h.id), 'D2 pessoa e histórico permanecem')
  validarTransicao('perdido', 'qualificacao', 0)
  const d2 = await demanda(p.id); const h2 = await hon(p.id, d2.id, 'Contratado'); await sincronizarCicloPorHonorario(ev, banco, h2, null)
  const c = await get(p.id)
  ok(c.etapa === 'ativo' && db.contatos.filter(x => x.telefone === p.telefone).length === 1, 'D3 quem não contratou pode contratar depois: vira cliente na MESMA ficha')
  const s = await pessoa('novo'); const hc = await hon(s.id, null, 'Pago', 'Consulta'); await sincronizarCicloPorHonorario(ev, banco, hc, null)
  ok((await get(s.id)).etapa === 'novo', 'D4 pagar a consulta não transforma em cliente')
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS CENÁRIOS PASSARAM')
process.exit(falhas ? 1 : 0)
