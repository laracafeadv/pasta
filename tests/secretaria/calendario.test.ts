import { contarPrazo, pascoa, feriadosDe } from '../../shared/utils/calendarioForense'
import { interpretarTexto } from '../../shared/utils/secretariaTexto'
let falhas = 0
const ok = (c: boolean, n: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const eq = (n: string, a: unknown, b: unknown) => ok(JSON.stringify(a) === JSON.stringify(b), `${n} → ${JSON.stringify(a)}${JSON.stringify(a) === JSON.stringify(b) ? '' : ' (esperado ' + JSON.stringify(b) + ')'}`)
const ctx = { trib: 'tjba', ssa: true, fac: false, susp: [] as any[] }

// ── calendário ──
eq('Páscoa 2026', pascoa(2026), '2026-04-05'); eq('Páscoa 2027', pascoa(2027), '2027-03-28')
eq('12/10 (N. Sra. Aparecida) não conta', contarPrazo('2026-10-09', 1, ctx).vencimento, '2026-10-13')
eq('recesso 20/12–20/01', contarPrazo('2026-12-18', 5, ctx).vencimento, '2027-01-27')
eq('Semana Santa', contarPrazo('2026-03-31', 1, ctx).vencimento, '2026-04-06')
eq('TRT5: 20/04 suspende prazo', contarPrazo('2026-04-17', 1, { ...ctx, trib: 'trt5' }).vencimento, '2026-04-22')
eq('TJBA: 20/04 facultativo não desconta por padrão', contarPrazo('2026-04-17', 1, ctx).vencimento, '2026-04-20')
eq('TJBA: desconta se marcar pontos facultativos', contarPrazo('2026-04-17', 1, { ...ctx, fac: true }).vencimento, '2026-04-22')
eq('suspensão anotada vale', contarPrazo('2026-10-14', 2, { ...ctx, susp: [{ de: '2026-10-15', ate: '2026-10-15', trib: 'todos', motivo: 'x' }] }).vencimento, '2026-10-19')
eq('suspensão de outro tribunal não vale', contarPrazo('2026-10-14', 2, { ...ctx, susp: [{ de: '2026-10-15', ate: '2026-10-15', trib: 'trt5' }] }).vencimento, '2026-10-16')
eq('São João em Salvador', contarPrazo('2026-06-23', 1, ctx).vencimento, '2026-06-25')
eq('sem municipal', contarPrazo('2026-06-23', 1, { ...ctx, ssa: false }).vencimento, '2026-06-24')
eq('15 dias úteis de 30/09/2026', contarPrazo('2026-09-30', 15, ctx).vencimento, '2026-10-22')
ok(feriadosDe(2027).some(f => f.nome === 'Sexta-feira Santa' && f.d === '2027-03-26'), 'Sexta-feira Santa 2027 = 26/03')

// ── texto livre (hoje = quarta 2026-09-30) ──
const H = '2026-09-30'
let p = interpretarTexto('prazo de 15 dias para réplica, intimada hoje', H)
eq('prazo: tipo/dias/inicio/título', [p.tipo, p.dias, p.inicio, p.titulo], ['prazo', 15, H, 'Réplica'])
p = interpretarTexto('prazo de 5 dias úteis para contestação, intimada ontem', H)
eq('prazo: ontem', [p.tipo, p.dias, p.inicio, p.titulo], ['prazo', 5, '2026-09-29', 'Contestação'])
p = interpretarTexto('me lembra amanhã às 10h de ligar para o cliente', H)
eq('lembrete amanhã 10h', [p.tipo, p.data, p.hora, p.titulo], ['lembrete', '2026-10-01', '10:00', 'Ligar para o cliente'])
p = interpretarTexto('audiência dia 15 às 14h30 na 2ª vara de família', H)
eq('audiência dia 15', [p.tipo, p.data, p.hora], ['audiencia', '2026-10-15', '14:30'])
p = interpretarTexto('consulta sexta às 9h com Maria', H)
eq('consulta sexta', [p.tipo, p.data, p.hora], ['consulta', '2026-10-02', '09:00'])
p = interpretarTexto('me lembra quarta de protocolar a inicial', H)
eq('mesma quarta → próxima semana', [p.tipo, p.data, p.titulo], ['lembrete', '2026-10-07', 'Protocolar a inicial'])
p = interpretarTexto('reunião 05/11 às 16:00', H)
eq('reunião com data', [p.tipo, p.data, p.hora], ['reuniao', '2026-11-05', '16:00'])
p = interpretarTexto('tarefa revisar contrato depois de amanhã', H)
eq('tarefa depois de amanhã', [p.tipo, p.data, p.titulo], ['tarefa', '2026-10-02', 'Revisar contrato'])
p = interpretarTexto('comprar café', H)
eq('texto sem data vira lembrete sem data', [p.tipo, p.data, p.hora, p.titulo], ['lembrete', '', '', 'Comprar café'])
p = interpretarTexto('prazo de 15 dias para réplica, publicada em 25/09', H)
eq('publicada em data', [p.dias, p.inicio], [15, '2026-09-25'])
console.log(falhas ? falhas + ' FALHA(S)' : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
