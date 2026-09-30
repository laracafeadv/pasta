import { banco, db, zerar } from '../formularios/fake-db'
import { criarItem, montarInicio, limparAtalhos } from '../../server/utils/secretaria'
import { hojeBR } from '../../server/utils/crm'
import { contarPrazo } from '../../shared/utils/calendarioForense'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, n: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const ME = 'u-lara', OUTRA = 'u-outra'
const hoje = hojeBR(), amanha = hojeBR(1), d5 = hojeBR(5), longe = hojeBR(40), ontem = hojeBR(-1), velho = hojeBR(-90)

zerar()
const item = (o: any) => ({ hora: null, local: null, cliente: null, obs: null, feito: false, user_id: ME, ...o })
db.secretaria_itens = [
  item({ id: 1, tipo: 'prazo', titulo: 'Réplica', dia: hoje }),
  item({ id: 2, tipo: 'audiencia', titulo: 'Audiência de instrução', dia: amanha, hora: '14:00:00', local: 'Fórum', cliente: 'Maria Souza', user_id: OUTRA }),
  item({ id: 3, tipo: 'compromisso', titulo: 'Alinhamento', dia: d5 }),
  item({ id: 4, tipo: 'prazo', titulo: 'Longe demais', dia: longe }),
  item({ id: 5, tipo: 'prazo', titulo: 'Já concluído', dia: hoje, feito: true }),
  item({ id: 6, tipo: 'prazo', titulo: 'Contestação vencida', dia: ontem }),
  item({ id: 7, tipo: 'prazo', titulo: 'Muito antigo', dia: velho }),
  item({ id: 8, tipo: 'tarefa', titulo: 'Tarefa atrasada (não é prazo)', dia: ontem }),
  item({ id: 9, tipo: 'tarefa', titulo: 'Protocolar petição', dia: amanha }),
]
db.lembretes_rapidos = [{ id: 1, user_id: ME, texto: 'Ligar ao cartório', data: hojeBR(-2), hora: null, feito: false }, { id: 2, user_id: OUTRA, texto: 'Lembrete de outra pessoa', data: hoje, hora: null, feito: false }]
db.compromissos = []; db.tarefas_internas = []
db.suspensoes_expediente = []; db.secretaria_config = []

// ── Início ──
let r = await montarInicio(banco, ME)
ok(r.hoje === hoje && r.config.tribunal === 'tjba' && r.config.cidade === 'Salvador' && r.config.atalhos.length >= 6, 'sem configuração salva: usa tribunal TJBA, Salvador e os atalhos padrão')
const ids = r.eventos.map(e => e.id)
ok([1, 2, 3, 9].every(i => ids.includes(i)), 'agenda traz prazo, audiência, compromisso e tarefa dos próximos 14 dias')
ok(!ids.includes(4) && !ids.includes(5) && !ids.includes(7) && !ids.includes(8), 'fora da janela, concluídos, prazos muito antigos e tarefa atrasada (não é prazo) não entram')
ok(ids.includes(6) && r.eventos.find(e => e.id === 6)!.dia === ontem, 'prazo vencido e sem baixa continua aparecendo (não some da vista)')
const aud = r.eventos.find(e => e.id === 2)!
ok(aud.tipo === 'audiencia' && aud.dia === amanha && aud.hora === '14:00' && aud.cliente === 'Maria Souza' && aud.local === 'Fórum' && aud.meu === false && r.eventos.find(e => e.id === 1)!.meu === true, 'audiência: dia, hora, cliente, local; "meu" = quem criou')
ok(r.eventos.map(e => e.dia).join() === [...r.eventos.map(e => e.dia)].sort().join(), 'agenda em ordem de data (vencidos primeiro)')
ok(r.lembretes.length === 1 && r.lembretes[0]!.texto === 'Ligar ao cartório', 'só os lembretes da própria usuária')
ok(Object.keys(db).every(k => !['compromissos', 'tarefas_internas', 'intimacoes'].includes(k) || db[k]!.length === 0), 'não lê nem grava nas tabelas de Agenda/Tarefas do CRM')

// ── Criar ──
const p = await criarItem(banco, ME, { tipo: 'prazo', titulo: 'Contestação', dias: 15, inicio: '2026-09-30', cliente: 'Maria Souza' })
const c = db.secretaria_itens.find((x: any) => x.titulo === 'Contestação')
ok(p.vencimento === '2026-10-22' && p.vencimento === contarPrazo('2026-09-30', 15, { trib: 'tjba', ssa: true, fac: false }).vencimento, 'prazo: vencimento calculado no servidor (15 dias úteis de 30/09/2026 = 22/10, TJBA, Salvador)')
ok(c.tipo === 'prazo' && c.dia === '2026-10-22' && c.data_intimacao === '2026-09-30' && c.dias_prazo === 15 && c.tribunal === 'tjba' && c.user_id === ME && c.cliente === 'Maria Souza' && /confirme/i.test(c.obs), 'prazo gravado na agenda própria: vencimento, intimação, dias, tribunal, autora, cliente e aviso')
db.secretaria_config = [{ user_id: ME, tribunal: 'trt5', pontos_facultativos: false, cidade: 'Salvador', atalhos: [] }]
db.suspensoes_expediente = [{ id: 1, de: '2026-10-15', ate: '2026-10-15', tribunal: 'todos', motivo: 'instabilidade' }]
const p2 = await criarItem(banco, ME, { tipo: 'prazo', titulo: 'Recurso', dias: 10, inicio: '2026-10-09' })
ok(p2.vencimento === contarPrazo('2026-10-09', 10, { trib: 'trt5', ssa: true, fac: false, susp: [{ de: '2026-10-15', ate: '2026-10-15', trib: 'todos' }] }).vencimento, 'prazo usa o tribunal escolhido e as suspensões anotadas')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'prazo', titulo: 'x', dias: 0 }), 'dias') && await lanca(() => criarItem(banco, ME, { tipo: 'prazo', titulo: 'x', dias: 400 }), 'dias'), 'prazo sem dias válidos é recusado')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'prazo', titulo: 'x', dias: 5, inicio: '31/09/2026' }), 'inválida'), 'data da intimação inválida é recusada')
await criarItem(banco, ME, { tipo: 'audiencia', titulo: 'Audiência nova', data: '2026-11-05', hora: '14:30', local: 'Vara de Família' })
const a = db.secretaria_itens.find((x: any) => x.titulo === 'Audiência nova')
ok(a.tipo === 'audiencia' && a.dia === '2026-11-05' && a.hora === '14:30' && a.local === 'Vara de Família', 'audiência com data, hora e local')
await criarItem(banco, ME, { tipo: 'reuniao', titulo: 'Reunião de equipe', data: '2026-11-06' })
ok(db.secretaria_itens.find((x: any) => x.titulo === 'Reunião de equipe').tipo === 'compromisso', 'reunião vira compromisso')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'audiencia', titulo: 'x' }), 'data'), 'audiência sem data é recusada')
await criarItem(banco, ME, { tipo: 'tarefa', titulo: 'Revisar contrato' })
ok(db.secretaria_itens.find((x: any) => x.titulo === 'Revisar contrato').dia === hoje, 'tarefa sem data vai para hoje')
const l = await criarItem(banco, ME, { tipo: 'lembrete', titulo: 'Ligar ao cliente', data: '2026-10-01', hora: '10:00' })
const lr = db.lembretes_rapidos.find((x: any) => x.texto === 'Ligar ao cliente')
ok(l.tipo === 'lembrete' && lr.user_id === ME && lr.hora === '10:00', 'lembrete pertence a quem criou')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'outro', titulo: 'x' }), 'Tipo') && await lanca(() => criarItem(banco, ME, { tipo: 'lembrete', titulo: '  ' }), 'título') && await lanca(() => criarItem(banco, ME, { tipo: 'lembrete', titulo: 'x', hora: '25:00' }), 'Hora'), 'tipo, título e hora inválidos são recusados')
ok(db.compromissos.length === 0 && db.tarefas_internas.length === 0, 'nada foi gravado nas tabelas do CRM')

// ── Atalhos ──
const at = limparAtalhos([{ id: 'a', nome: 'INSS', url: 'meu.inss.gov.br' }, { id: 'a', nome: 'Mal', url: 'javascript:alert(1)' }, { nome: '  ', url: '' }])
ok(at[0]!.url === 'https://meu.inss.gov.br' && at[1]!.url === '' && at[2]!.nome === 'Atalho' && new Set(at.map(x => x.id)).size === 3, 'atalhos: acrescenta https, bloqueia javascript:, nome padrão, ids únicos')
console.log(falhas ? falhas + ' FALHA(S)' : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
