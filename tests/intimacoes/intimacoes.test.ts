import { banco, db, zerar } from '../formularios/fake-db'
import { limparIntimacao, registrarIntimacao, definirPrazoIntimacao, tratarIntimacao, excluirIntimacao, dataTrabalhoPadrao } from '../../server/utils/intimacoes'
import { calcularPrazo } from '../../shared/utils/juridico'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, nome: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${nome}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const ev = {} as any
const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

zerar()
db.contatos = [{ id: 1, nome: 'Maria' }]
db.casos = [{ id: 1, contato_id: 1, titulo: 'Divórcio litigioso', tipo: 'judicial', status: 'ativo' }, { id: 2, contato_id: 1, titulo: 'Inventário extrajudicial', tipo: 'extrajudicial', status: 'ativo' }]
db.processos = [{ id: 10, caso_id: 1, contato_id: 1, natureza: 'judicial', numero: '0000123-45.2025.8.05.0001', status: 'ativo' }, { id: 20, caso_id: 2, contato_id: 1, natureza: 'extrajudicial', numero: null, status: 'ativo' }]
for (const t of ['intimacoes', 'compromissos', 'tarefas_internas', 'movimentacoes', 'atividades']) db[t] = []
const base = { processo_id: 10, data_publicacao: hoje, tipo: 'Intimação para manifestação', conteudo: 'Manifestar sobre a contestação', dias_prazo: 15, data_trabalho: null }

// ── Registro com prazo ──
const r1 = await registrarIntimacao(ev, banco, base, 'u1')
const venc = calcularPrazo(hoje, 15).vencimento
const comp = db.compromissos[0], tar = db.tarefas_internas[0]
ok(r1.vencimento === venc && comp.tipo === 'prazo' && comp.data_limite === venc && comp.dias_prazo === 15 && comp.processo_id === 10 && comp.caso_id === 1 && comp.contato_id === 1, 'prazo criado na agenda: dias úteis a partir da publicação, ligado ao processo, demanda e cliente')
ok(tar.processo_id === 10 && tar.caso_id === 1 && tar.prioridade === 'alta' && tar.titulo.includes('Cumprir prazo') && tar.prazo === dataTrabalhoPadrao(venc) && tar.prazo <= venc, 'tarefa de trabalho ligada ao processo, 2 dias antes do vencimento (nunca no passado)')
ok(db.movimentacoes.some((m: any) => m.processo_id === 10 && m.tipo === 'Publicação / intimação' && m.texto.includes('contestação') && m.texto.includes('dias úteis')), 'andamento lançado no processo (tipo Publicação / intimação)')
ok(db.atividades.some((a: any) => a.processo_id === 10 && a.caso_id === 1 && /Intimação registrada/.test(a.texto)), 'histórico da demanda e do processo')
ok(db.intimacoes[0].compromisso_id === comp.id && db.intimacoes[0].tarefa_id === tar.id && db.intimacoes[0].status === 'a_tratar' && db.intimacoes[0].caso_id === 1, 'intimação guarda o prazo e a tarefa gerados e nasce "a tratar"')

// ── Trabalho antecipado explícito ──
const r2 = await registrarIntimacao(ev, banco, { ...base, tipo: 'Decisão', dias_prazo: 5, data_trabalho: hoje }, 'u1')
ok(db.tarefas_internas.find((t: any) => t.id === db.intimacoes[1].tarefa_id).prazo === hoje && r2.dataTrabalho === hoje, 'data de trabalho escolhida é respeitada')

// ── Sem prazo: nunca fica sem próxima ação ──
const r3 = await registrarIntimacao(ev, banco, { ...base, tipo: 'Sentença', dias_prazo: null, conteudo: null }, 'u1')
const i3 = db.intimacoes[2], t3 = db.tarefas_internas.find((t: any) => t.id === i3.tarefa_id)
ok(r3.vencimento === null && i3.compromisso_id === undefined && t3.titulo.includes('Analisar intimação') && t3.prazo === hoje && db.compromissos.length === 2, 'sem prazo informado: sem prazo na agenda, mas tarefa "analisar e definir o prazo" para hoje')
ok(db.movimentacoes.some((m: any) => /prazo a definir/.test(m.texto)), 'andamento registra "prazo a definir"')
// definir depois
const d3 = await definirPrazoIntimacao(ev, banco, i3.id, 10, null, 'u1')
const c3 = db.compromissos.find((c: any) => c.id === db.intimacoes[2].compromisso_id)
ok(d3.vencimento === calcularPrazo(hoje, 10).vencimento && c3.data_limite === d3.vencimento && db.tarefas_internas.find((t: any) => t.id === i3.tarefa_id).titulo.includes('Cumprir prazo'), 'definir o prazo depois cria o prazo na agenda e transforma a tarefa em "cumprir prazo"')
// corrigir prazo atualiza (não duplica)
const antes = db.compromissos.length
await definirPrazoIntimacao(ev, banco, i3.id, 5, null, 'u1')
ok(db.compromissos.length === antes && db.compromissos.find((c: any) => c.id === c3.id).dias_prazo === 5, 'corrigir o prazo atualiza o mesmo prazo (sem duplicar)')

// ── Só processo judicial ──
ok(await lanca(() => registrarIntimacao(ev, banco, { ...base, processo_id: 20 }, 'u1'), 'extrajudicial'), 'procedimento extrajudicial não recebe intimação')
ok(await lanca(() => registrarIntimacao(ev, banco, { ...base, processo_id: 999 }, 'u1'), 'não encontrado'), 'processo inexistente é recusado')

// ── Tratar / reabrir ──
await tratarIntimacao(ev, banco, db.intimacoes[0].id, { obs: 'Petição protocolada' }, 'u1')
ok(db.intimacoes[0].status === 'tratada' && db.intimacoes[0].tratada_obs === 'Petição protocolada' && db.compromissos[0].status === 'concluido' && db.tarefas_internas[0].concluida === true, 'tratar dá baixa no prazo e na tarefa')
ok(await lanca(() => tratarIntimacao(ev, banco, db.intimacoes[0].id, {}, 'u1'), 'tratada') && await lanca(() => definirPrazoIntimacao(ev, banco, db.intimacoes[0].id, 5, null, 'u1'), 'reabra'), 'não trata duas vezes nem altera prazo de intimação tratada')
await tratarIntimacao(ev, banco, db.intimacoes[0].id, { reabrir: true }, 'u1')
ok(db.intimacoes[0].status === 'a_tratar' && db.compromissos[0].status === 'pendente' && db.tarefas_internas[0].concluida === false, 'reabrir volta prazo e tarefa a pendentes')

// ── Excluir registro por engano ──
const nc = db.compromissos.length, nt = db.tarefas_internas.length
await excluirIntimacao(banco, db.intimacoes[1].id)
ok(db.intimacoes.length === 2 && db.compromissos.length === nc - 1 && db.tarefas_internas.length === nt - 1, 'excluir remove também o prazo e a tarefa pendentes gerados')
await tratarIntimacao(ev, banco, db.intimacoes[0].id, {}, 'u1')
const nc2 = db.compromissos.length
await excluirIntimacao(banco, db.intimacoes[0].id)
ok(db.compromissos.length === nc2, 'prazo já concluído não é apagado ao excluir a intimação')

// ── Validação ──
ok(await lanca(() => limparIntimacao({ ...base, tipo: 'Qualquer' }), 'tipo') && await lanca(() => limparIntimacao({ ...base, dias_prazo: 0 }), 'dias') && await lanca(() => limparIntimacao({ ...base, dias_prazo: 366 }), 'dias') && await lanca(() => limparIntimacao({ ...base, data_publicacao: '2026-13-40x' }), 'data') && await lanca(() => limparIntimacao({ ...base, processo_id: 'x' }), 'processo'), 'validação: tipo, prazo (1–365), data e processo')
ok(limparIntimacao({ ...base, dias_prazo: '' }).dias_prazo === null && limparIntimacao({ ...base, conteudo: '  ' }).conteudo === null, 'campos opcionais vazios viram nulo')
ok(dataTrabalhoPadrao('2030-01-20', '2030-01-01') === '2030-01-18' && dataTrabalhoPadrao('2030-01-02', '2030-01-01') === '2030-01-01', 'data de trabalho padrão: 2 dias antes, nunca antes de hoje')

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTODOS OS TESTES DE INTIMAÇÕES PASSARAM')
process.exit(falhas ? 1 : 0)
