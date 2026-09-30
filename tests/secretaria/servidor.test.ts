import { banco, db, zerar } from '../formularios/fake-db'
import { criarItem, montarInicio, limparAtalhos } from '../../server/utils/secretaria'
import { hojeBR } from '../../server/utils/crm'
import { contarPrazo } from '../../shared/utils/calendarioForense'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, n: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const ME = 'u-lara', OUTRA = 'u-outra'
const hoje = hojeBR(), amanha = hojeBR(1), d5 = hojeBR(5), longe = hojeBR(40)

zerar()
db.contatos = [{ id: 1, nome: 'Maria Souza', etapa: 'ativo' }, { id: 2, nome: 'Novo Lead', etapa: 'novo' }, { id: 3, nome: 'Outro Lead', etapa: 'novo' }]
db.compromissos = [
  { id: 1, tipo: 'prazo', titulo: 'Réplica', status: 'pendente', data_limite: hoje, inicio: null, contato_id: 1, responsavel_id: ME },
  { id: 2, tipo: 'audiencia', titulo: 'Audiência de instrução', status: 'pendente', data_limite: null, inicio: `${amanha}T14:00:00-03:00`, local: 'Fórum', contato_id: 1, responsavel_id: OUTRA },
  { id: 3, tipo: 'reuniao', titulo: 'Alinhamento', status: 'pendente', data_limite: d5, inicio: null, responsavel_id: null },
  { id: 4, tipo: 'prazo', titulo: 'Longe demais', status: 'pendente', data_limite: longe, inicio: null, responsavel_id: ME },
  { id: 5, tipo: 'prazo', titulo: 'Já concluído', status: 'concluido', data_limite: hoje, inicio: null, responsavel_id: ME },
]
db.tarefas_internas = [{ id: 1, titulo: 'Protocolar petição', prazo: amanha, concluida: false }, { id: 2, titulo: 'Tarefa feita', prazo: amanha, concluida: true }]
db.lembretes_rapidos = [{ id: 1, user_id: ME, texto: 'Ligar ao cartório', data: hojeBR(-2), hora: null, feito: false }, { id: 2, user_id: OUTRA, texto: 'Lembrete de outra pessoa', data: hoje, hora: null, feito: false }]
db.intimacoes = [{ id: 1, status: 'a_tratar' }, { id: 2, status: 'tratada' }]
db.suspensoes_expediente = []; db.secretaria_config = []

// ── Início ──
let r = await montarInicio(banco, ME)
ok(r.hoje === hoje && r.config.tribunal === 'tjba' && r.config.cidade === 'Salvador' && r.config.atalhos.length >= 6, 'sem configuração salva: usa tribunal TJBA, Salvador e os atalhos padrão')
const ids = r.eventos.map(e => e.k)
ok(ids.includes('c1') && ids.includes('c2') && ids.includes('c3') && ids.includes('t1'), 'agenda traz prazo, audiência (por horário), reunião e tarefa dos próximos 14 dias')
ok(!ids.includes('c4') && !ids.includes('c5') && !ids.includes('t2'), 'fora da janela de 14 dias, concluídos e tarefas feitas não aparecem')
const aud = r.eventos.find(e => e.k === 'c2')!, reu = r.eventos.find(e => e.k === 'c3')!
ok(aud.tipo === 'audiencia' && aud.dia === amanha && aud.hora === '14:00' && aud.contato === 'Maria Souza' && aud.local === 'Fórum', 'audiência: dia e hora em Brasília, cliente e local')
ok(reu.tipo === 'compromisso' && reu.hora === null && reu.meu === true && aud.meu === false, 'reunião vira "compromisso"; "minhas" = meu ou sem responsável')
ok(r.eventos.map(e => e.dia).join() === [...r.eventos.map(e => e.dia)].sort().join(), 'agenda em ordem de data')
ok(r.lembretes.length === 1 && r.lembretes[0]!.texto === 'Ligar ao cartório', 'só os lembretes da própria usuária')

// ── Criar ──
const p = await criarItem(banco, ME, { tipo: 'prazo', titulo: 'Contestação', dias: 15, inicio: '2026-09-30' })
const c = db.compromissos.find((x: any) => x.titulo === 'Contestação')
ok(p.vencimento === contarPrazo('2026-09-30', 15, { trib: 'tjba', ssa: true, fac: false }).vencimento && p.vencimento === '2026-10-22', 'prazo: vencimento calculado no servidor (15 dias úteis de 30/09/2026 = 22/10, TJBA, Salvador)')
ok(c.tipo === 'prazo' && c.data_publicacao === '2026-09-30' && c.dias_prazo === 15 && c.data_limite === '2026-10-22' && c.responsavel_id === ME && /TJBA/.test(c.observacao) && /confirme/i.test(c.observacao), 'prazo gravado com publicação, dias, vencimento, responsável e aviso')
db.secretaria_config = [{ user_id: ME, tribunal: 'trt5', pontos_facultativos: false, cidade: 'Salvador', atalhos: [] }]
db.suspensoes_expediente = [{ id: 1, de: '2026-10-15', ate: '2026-10-15', tribunal: 'todos', motivo: 'instabilidade' }]
const p2 = await criarItem(banco, ME, { tipo: 'prazo', titulo: 'Recurso', dias: 10, inicio: '2026-10-09' })
ok(p2.vencimento === contarPrazo('2026-10-09', 10, { trib: 'trt5', ssa: true, fac: false, susp: [{ de: '2026-10-15', ate: '2026-10-15', trib: 'todos' }] }).vencimento, 'prazo usa o tribunal escolhido e as suspensões anotadas')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'prazo', titulo: 'x', dias: 0 }), 'dias') && await lanca(() => criarItem(banco, ME, { tipo: 'prazo', titulo: 'x', dias: 400 }), 'dias'), 'prazo sem dias válidos é recusado')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'prazo', titulo: 'x', dias: 5, inicio: '31/09/2026' }), 'inválida'), 'data da intimação inválida é recusada')
const a = await criarItem(banco, ME, { tipo: 'audiencia', titulo: 'Audiência', data: '2026-11-05', hora: '14:30', local: 'Vara de Família' })
ok(db.compromissos.find((x: any) => x.titulo === 'Audiência').inicio === '2026-11-05T14:30:00-03:00', 'audiência com hora: início em Brasília')
const cs = await criarItem(banco, ME, { tipo: 'consulta', titulo: 'Consulta', data: '2026-11-06' })
ok(db.compromissos.find((x: any) => x.titulo === 'Consulta').data_limite === '2026-11-06', 'consulta sem hora: fica no dia')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'audiencia', titulo: 'x' }), 'data'), 'audiência sem data é recusada')
const t = await criarItem(banco, ME, { tipo: 'tarefa', titulo: 'Revisar contrato', data: '2026-10-02' })
ok(db.tarefas_internas.find((x: any) => x.titulo === 'Revisar contrato').prazo === '2026-10-02', 'tarefa vai para Tarefas com o prazo')
const l = await criarItem(banco, ME, { tipo: 'lembrete', titulo: 'Ligar ao cliente', data: '2026-10-01', hora: '10:00' })
const lr = db.lembretes_rapidos.find((x: any) => x.texto === 'Ligar ao cliente')
ok(lr.user_id === ME && lr.hora === '10:00' && lr.texto === 'Ligar ao cliente', 'lembrete pertence a quem criou')
ok(await lanca(() => criarItem(banco, ME, { tipo: 'outro', titulo: 'x' }), 'Tipo') && await lanca(() => criarItem(banco, ME, { tipo: 'lembrete', titulo: '  ' }), 'título') && await lanca(() => criarItem(banco, ME, { tipo: 'lembrete', titulo: 'x', hora: '25:00' }), 'Hora'), 'tipo, título e hora inválidos são recusados')

// ── Atalhos ──
const at = limparAtalhos([{ id: 'a', nome: 'INSS', url: 'meu.inss.gov.br' }, { id: 'a', nome: 'Mal', url: 'javascript:alert(1)' }, { nome: '  ', url: '' }])
ok(at[0]!.url === 'https://meu.inss.gov.br' && at[1]!.url === '' && at[2]!.nome === 'Atalho' && new Set(at.map(x => x.id)).size === 3, 'atalhos: acrescenta https, bloqueia javascript:, nome padrão, ids únicos')
console.log(falhas ? falhas + ' FALHA(S)' : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
