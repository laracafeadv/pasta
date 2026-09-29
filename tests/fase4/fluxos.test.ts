import { banco, db, zerar } from '../formularios/fake-db'
import { limparProcesso, semearEtapas, sincronizarFase, concluirProcesso, reabrirProcesso } from '../../server/utils/processos'
import { sincronizarAtuacao, variantePara } from '../../server/utils/demandas'
import { desfechosDa, etapaAtual, TIPOS_PROCEDIMENTO_EXTRAJUDICIAL } from '../../shared/data/procedimentos'
import { numeroCnjValido } from '../../shared/utils/juridico'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, nome: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${nome}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const ev = {} as any

zerar()
db.contatos = [{ id: 1, nome: 'Maria' }]
db.casos = []; db.processos = []; db.processo_etapas = []; db.processo_pendencias = []; db.movimentacoes = []; db.atividades = []
const cnj = (() => { for (let dv = 1; dv < 99; dv++) { const n = `0000123-${String(dv).padStart(2, '0')}.2025.8.05.0001`; if (numeroCnjValido(n)) return n } throw new Error('sem CNJ válido') })()

const demanda = (id: number, titulo: string, tipo: string, procedimento: string | null) => db.casos.push({ id, contato_id: 1, titulo, tipo, procedimento, status: 'ativo' })
// Replica o que o endpoint POST /api/processos faz (validação + insert + etapas + evolução da demanda).
async function registrar(casoId: number, body: any) {
  const d = limparProcesso({ ...body, caso_id: casoId }, { criando: true })
  const { data: p } = await banco.from('processos').insert({ ...d, contato_id: 1, status: 'ativo' }).select().single()
  if (p.natureza === 'extrajudicial') await semearEtapas(banco, p.id, p.tipo_procedimento)
  await sincronizarAtuacao(banco, casoId, ev, null)
  return (await banco.from('processos').select().eq('id', p.id).single()).data
}
const etapasDe = (id: number) => db.processo_etapas.filter((e: any) => e.processo_id === id).sort((a: any, b: any) => a.ordem - b.ordem)
const T_INV = 'Inventário extrajudicial (escritura)', T_DIV = 'Divórcio / dissolução extrajudicial (escritura)'

// ═══ 1) Inventário EXTRAJUDICIAL ═══
demanda(1, 'Inventário — Roberto', 'consultivo', 'inventario/extrajudicial')
const p1 = await registrar(1, { natureza: 'extrajudicial', tipo_procedimento: T_INV, orgao: '2º Tabelionato de Notas', comarca: 'Salvador', uf: 'BA', numero: 'Livro 12 fl. 30' })
ok(p1.tipo_procedimento === T_INV && p1.tribunal === null && p1.orgao.includes('Tabelionato') && p1.numero === 'Livro 12 fl. 30', 'inv. extrajudicial: cartório, protocolo e tipo de procedimento (sem tribunal, CNJ ou vara)')
ok(etapasDe(p1.id).length === 7 && etapasDe(p1.id)[0].titulo.includes('Protocolo') && p1.fase === etapasDe(p1.id)[0].titulo, 'inv. extrajudicial: 7 etapas formais criadas e a fase é a etapa em andamento')
ok(db.casos[0].tipo === 'extrajudicial' && db.casos.length === 1, 'inv. extrajudicial: a demanda consultiva evoluiu para extrajudicial (mesma demanda, sem duplicar)')
ok(db.atividades.some((a: any) => /Consultiva → Extrajudicial/.test(a.texto)), 'inv. extrajudicial: evolução registrada no histórico')
// pendência (exigência do cartório) trava a conclusão
db.processo_pendencias.push({ id: 1, processo_id: p1.id, descricao: 'Certidão de ônus atualizada', aguardando: 'cliente', prazo: null, resolvida_em: null })
ok(await lanca(() => concluirProcesso(ev, banco, p1.id, { desfecho: 'Escritura lavrada' }, null), 'etapas pendentes'), 'inv. extrajudicial: não conclui com etapas pendentes')
for (const e of etapasDe(p1.id)) { e.status = 'concluida'; e.concluida_em = '2026-09-29' }
await sincronizarFase(banco, p1.id)
ok((await banco.from('processos').select().eq('id', p1.id).single()).data.fase === 'Etapas cumpridas', 'inv. extrajudicial: todas as etapas cumpridas → fase "Etapas cumpridas"')
ok(await lanca(() => concluirProcesso(ev, banco, p1.id, { desfecho: 'Escritura lavrada' }, null), 'pendência'), 'inv. extrajudicial: não conclui com pendência aberta')
db.processo_pendencias[0].resolvida_em = '2026-09-29'
ok(await lanca(() => concluirProcesso(ev, banco, p1.id, { desfecho: 'Sentença procedente' }, null)), 'inv. extrajudicial: desfecho de processo judicial é recusado')
const r1 = await concluirProcesso(ev, banco, p1.id, { desfecho: 'Escritura lavrada e registrada / averbada', data: '2026-09-29' }, 'u1')
const c1 = (await banco.from('processos').select().eq('id', p1.id).single()).data
ok(c1.status === 'encerrado' && c1.desfecho.startsWith('Escritura lavrada') && c1.data_encerramento === '2026-09-29' && r1.demandaSemProcessoAberto, 'inv. extrajudicial: conclusão com desfecho próprio; demanda sinalizada como sem procedimento aberto')
ok(db.movimentacoes.some((m: any) => m.processo_id === p1.id && m.tipo === 'Conclusão') && db.atividades.some((a: any) => a.processo_id === p1.id && /concluído/.test(a.texto)), 'inv. extrajudicial: conclusão nos andamentos e no histórico do procedimento')
await reabrirProcesso(ev, banco, p1.id, null)
ok((await banco.from('processos').select().eq('id', p1.id).single()).data.status === 'ativo' && (await banco.from('processos').select().eq('id', p1.id).single()).data.desfecho === null, 'reabrir limpa o desfecho')

// ═══ 2) Inventário JUDICIAL ═══
demanda(2, 'Inventário — Helena (herdeiro menor)', 'consultivo', 'inventario/judicial')
const p2 = await registrar(2, { natureza: 'judicial', numero: cnj, tribunal: 'TJBA', orgao: '3ª Vara de Sucessões', comarca: 'Salvador', uf: 'BA', fase: 'Postulatória (petição inicial)', valor: 850000 })
ok(p2.numero === cnj && p2.tribunal === 'TJBA' && p2.orgao.includes('Vara') && p2.fase === 'Postulatória (petição inicial)' && p2.valor === 850000, 'inv. judicial: CNJ, tribunal, vara, comarca, fase e valor da causa')
ok(etapasDe(p2.id).length === 0 && p2.tipo_procedimento === null, 'inv. judicial: não recebe etapas nem tipo de procedimento (fluxo do judicial é fase + movimentações)')
ok(db.casos.find((c: any) => c.id === 2).tipo === 'judicial' && db.casos.length === 2, 'inv. judicial: demanda evolui para judicial sem duplicar')
ok(await lanca(() => registrar(2, { natureza: 'judicial', numero: '1234567-00.2025.8.05.0001', tribunal: 'TJBA' }), 'inválido'), 'CNJ inválido é recusado')
ok(await lanca(() => registrar(2, { natureza: 'judicial', tipo_procedimento: T_INV }), 'extrajudicial'), 'judicial recusa campo do extrajudicial (tipo de procedimento)')
ok(await lanca(() => registrar(2, { natureza: 'judicial', fase: 'Protocolo / agendamento' }), 'Fase'), 'judicial só aceita fases processuais')
ok(await lanca(() => registrar(2, { natureza: 'extrajudicial', tipo_procedimento: T_INV, tribunal: 'TJBA' }), 'Tribunal'), 'extrajudicial recusa tribunal')
ok(await lanca(() => registrar(2, { natureza: 'extrajudicial', orgao: 'Cartório' }), 'tipo de procedimento'), 'extrajudicial exige o tipo de procedimento')
ok(await lanca(() => limparProcesso({ natureza: 'judicial', status: 'encerrado' }), 'Concluir'), 'encerrar só pela conclusão com desfecho')
ok(await lanca(() => concluirProcesso(ev, banco, p2.id, { desfecho: 'Escritura lavrada' }, null)) && await lanca(() => concluirProcesso(ev, banco, p2.id, {}, null), 'terminou'), 'judicial: desfecho de cartório é recusado; desfecho é obrigatório')
const r2 = await concluirProcesso(ev, banco, p2.id, { desfecho: 'Partilha homologada (sentença / formal de partilha)' }, null)
ok((await banco.from('processos').select().eq('id', p2.id).single()).data.status === 'encerrado' && r2.demandaSemProcessoAberto, 'inv. judicial: conclui com desfecho judicial (sem exigir etapas)')

// ═══ 3) Divórcio EXTRAJUDICIAL ═══
demanda(3, 'Divórcio consensual — Ana e Paulo', 'consultivo', 'divorcio/extrajudicial')
const p3 = await registrar(3, { natureza: 'extrajudicial', tipo_procedimento: T_DIV, orgao: '1º Tabelionato', comarca: 'Lauro de Freitas', uf: 'BA' })
const e3 = etapasDe(p3.id)
ok(e3.length === 7 && e3.some((e: any) => e.titulo.startsWith('SEFAZ')) && !e3.some((e: any) => /ITCMD/.test(e.titulo)), 'div. extrajudicial: etapas do divórcio (SEFAZ só se partilha desigual), sem etapas de inventário')
const sefaz = e3.find((e: any) => e.titulo.startsWith('SEFAZ')); sefaz.status = 'dispensada'
for (const e of e3) if (e.status === 'pendente') e.status = 'concluida'
await sincronizarFase(banco, p3.id)
const r3 = await concluirProcesso(ev, banco, p3.id, { desfecho: 'Escritura lavrada' }, null)
ok(r3.desfecho === 'Escritura lavrada' && (await banco.from('processos').select().eq('id', p3.id).single()).data.status === 'encerrado', 'div. extrajudicial: etapa opcional dispensada e procedimento concluído')

// ═══ 4) Divórcio JUDICIAL ═══
demanda(4, 'Divórcio litigioso — Carla', 'consultivo', 'divorcio/judicial')
const p4 = await registrar(4, { natureza: 'judicial', numero: '', tribunal: 'TJBA', orgao: '1ª Vara de Família', comarca: 'Salvador', uf: 'BA', fase: 'Instrução' })
ok(p4.numero === null && p4.fase === 'Instrução' && etapasDe(p4.id).length === 0, 'div. judicial: pode ser registrado antes da distribuição (sem CNJ), sem dado artificial')
db.processos.find((p: any) => p.id === p4.id).numero = cnj.replace('0000123', '0000124')
const r4 = await concluirProcesso(ev, banco, p4.id, { desfecho: 'Acordo homologado' }, null)
ok(r4.desfecho === 'Acordo homologado', 'div. judicial: conclui por acordo homologado')

// ═══ 5) Demanda consultiva que depois gera processo ═══
demanda(5, 'Consulta — divórcio (ainda não sabe se vai judicializar)', 'consultivo', 'divorcio/extrajudicial')
const antes = db.casos.length
const p5a = await registrar(5, { natureza: 'extrajudicial', tipo_procedimento: T_DIV, orgao: 'Cartório X' })
const c5 = () => db.casos.find((c: any) => c.id === 5)
ok(c5().tipo === 'extrajudicial' && c5().procedimento === 'divorcio/extrajudicial', 'consultiva → extrajudicial: mesma demanda')
// o cartório recusa (herdeiro/filho menor): conversão em judicial NA MESMA demanda
await concluirProcesso(ev, banco, p5a.id, { desfecho: 'Convertido em processo judicial' }, null)
const p5b = await registrar(5, { natureza: 'judicial', tribunal: 'TJBA', orgao: '2ª Vara de Família', comarca: 'Salvador', uf: 'BA', fase: 'Postulatória (petição inicial)' })
ok(db.casos.length === antes && c5().tipo === 'judicial', 'extrajudicial convertido em judicial: continua a MESMA demanda (nada duplicado), atuação = judicial')
ok(c5().procedimento === 'divorcio/judicial' && db.atividades.some((a: any) => a.caso_id === 5 && /Roteiro do serviço/.test(a.texto)), 'o roteiro do serviço acompanha (Divórcio extrajudicial → judicial), registrado no histórico')
ok(db.processos.filter((p: any) => p.caso_id === 5).length === 2 && db.processos.filter((p: any) => p.caso_id === 5).every((p: any) => p.contato_id === 1), 'a demanda guarda os dois: o procedimento concluído (histórico) e o processo judicial')
ok(variantePara('divorcio/extrajudicial', 'judicial') === 'divorcio/judicial' && variantePara('inventario/extrajudicial', 'judicial') === 'inventario/judicial' && variantePara('pacto-antenupcial/padrao', 'judicial') === null && variantePara(null, 'judicial') === null, 'variantePara: só troca a forma quando o serviço tem a outra variante')

// consultiva pura → judicial sem serviço definido (não inventa roteiro)
demanda(6, 'Consulta genérica', 'consultivo', null)
await registrar(6, { natureza: 'judicial', tribunal: 'TJBA' })
ok(db.casos.find((c: any) => c.id === 6).tipo === 'judicial' && db.casos.find((c: any) => c.id === 6).procedimento === null, 'consultiva sem serviço definido → judicial sem inventar procedimento')

// Utilitários
ok(desfechosDa('judicial').some(d => d.valor === 'Acordo homologado') && desfechosDa('extrajudicial').some(d => d.valor === 'Convertido em processo judicial') && !desfechosDa('judicial').some(d => /Escritura/.test(d.valor)), 'desfechos são próprios de cada natureza')
ok(etapaAtual([{ ordem: 2, status: 'pendente', titulo: 'B' }, { ordem: 1, status: 'concluida', titulo: 'A' }, { ordem: 3, status: 'pendente', titulo: 'C' }]) === 'B' && etapaAtual([{ ordem: 1, status: 'dispensada', titulo: 'A' }]) === null, 'etapaAtual: primeira pendente por ordem')
ok(TIPOS_PROCEDIMENTO_EXTRAJUDICIAL.every(t => t.etapas.length >= 3) && TIPOS_PROCEDIMENTO_EXTRAJUDICIAL.some(t => t.servicos.includes('inventario')), 'todos os tipos de procedimento têm etapas próprias')

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS FLUXOS PASSARAM')
process.exit(falhas ? 1 : 0)
