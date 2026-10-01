import { banco, db, zerar } from '../formularios/fake-db'
import { atualizarInicial, criarInicial, excluirInicial, limparInicial, listarIniciais, moverInicial } from '../../server/utils/iniciaisSecretaria'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, n: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const U = 'u-lara'
const cnj = (() => { for (let d = 0; d < 100; d++) { const n = `0000123-${String(d).padStart(2, '0')}.2026.8.05.0001`; const dg = n.replace(/\D/g, ''); let r = 0; for (const ch of dg.slice(0, 7) + dg.slice(9) + dg.slice(7, 9)) r = (r * 10 + Number(ch)) % 97; if (r === 1) return n } return '' })()

ok(!!(await lanca(() => limparInicial({}, true), 'cliente')) && !!(await lanca(() => limparInicial({ cliente: 'x', etapa: 'ganhou' }), 'Etapa')) && !!(await lanca(() => limparInicial({ cliente: 'x', area: 'Astronomia' }), 'Área')) && !!(await lanca(() => limparInicial({ cliente: 'x', prioridade: 'urgentissima' }), 'Prioridade')) && !!(await lanca(() => limparInicial({ cliente: 'x', meta_protocolo: '31/12' }), 'Meta')) && !!(await lanca(() => limparInicial({ processo_numero: '123' }), 'CNJ')), 'validação: cliente, etapa, área, prioridade, data e CNJ')
const d = limparInicial({ cliente: '  Maria  ', checklist: [{ texto: ' CTPS ', ok: 1 }, { texto: 'ctps' }], id: 9, user_id: 'outro', created_at: 'x', acao: '', processo_numero: cnj.replace(/\D/g, '') }, true) as any
ok(d.cliente === 'Maria' && d.checklist.length === 1 && d.checklist[0].ok === true && d.acao === null && d.processo_numero === cnj && !('id' in d) && !('user_id' in d) && !('created_at' in d), 'whitelist: limpa campos, checklist sem repetido, CNJ formatado, ignora id/user_id')

zerar(); db.secretaria_iniciais = []
const i1 = await criarInicial(banco, U, { cliente: 'Maria Souza', acao: 'Divórcio litigioso', area: 'Família', parte_contraria: 'João Souza', meta_protocolo: '2026-10-10', prazo_fatal: '2026-12-01', prazo_fatal_tipo: 'decadencia', prioridade: 'alta', etapa: 'aguardando', checklist: [{ texto: 'Certidão de casamento' }, { texto: 'Comprovante de renda' }] })
ok(i1.user_id === U && i1.etapa === 'aguardando' && i1.checklist.length === 2 && i1.prazo_fatal_tipo === 'decadencia', 'inicial criada com a ficha completa')
ok(!!(await lanca(() => criarInicial(banco, U, { cliente: 'X', meta_protocolo: '2026-12-02', prazo_fatal: '2026-12-01' }), 'depois do prazo fatal')) && (await listarIniciais(banco)).length === 1, 'meta depois do prazo fatal é recusada (nada é gravado)')
let u = await atualizarInicial(banco, i1.id, { obs: 'cliente ligou' }); ok(u.obs === 'cliente ligou' && u.etapa === 'aguardando', 'editar campo não muda etapa')
ok(!!(await lanca(() => atualizarInicial(banco, i1.id, { prazo_fatal: '2026-10-01' }), 'depois do prazo fatal')), 'editar o prazo fatal para antes da meta existente é recusado')
u = await atualizarInicial(banco, i1.id, { etapa: 'redacao' }); ok(u.etapa === 'redacao' && Date.now() - Date.parse(u.etapa_desde) < 5000, 'mudar etapa reinicia "há quantos dias nesta etapa"')

// mover
ok(!!(await lanca(() => moverInicial(banco, i1.id, { etapa: 'pronta' }), '2 documento')) && db.secretaria_iniciais[0].etapa === 'redacao', 'chegar a "Pronta" com documentos pendentes exige confirmação (nada muda)')
let m = await moverInicial(banco, i1.id, { etapa: 'pronta', confirmar_pendencias: true }); ok(m.etapa === 'pronta', 'com confirmação, avança mesmo com pendências')
ok(!!(await lanca(() => moverInicial(banco, i1.id, { etapa: 'protocolada', confirmar_pendencias: true }), 'data do protocolo')) && db.secretaria_iniciais[0].etapa === 'pronta', 'protocolar sem a data é recusado')
ok(!!(await lanca(() => moverInicial(banco, i1.id, { etapa: 'protocolada', confirmar_pendencias: true, protocolo_data: '2026-10-09', processo_numero: '0000000-00.0000.0.00.0000' }), 'CNJ')), 'protocolar com número inválido é recusado')
m = await moverInicial(banco, i1.id, { etapa: 'protocolada', confirmar_pendencias: true, protocolo_data: '2026-10-09', processo_numero: cnj })
ok(m.etapa === 'protocolada' && m.protocolo_data === '2026-10-09' && m.processo_numero === cnj, 'protocolada guarda data e número')
m = await moverInicial(banco, i1.id, { etapa: 'revisao' }); ok(m.etapa === 'revisao' && m.processo_numero === cnj, 'voltar de protocolada não apaga data e número')
m = await moverInicial(banco, i1.id, { etapa: 'pronta', confirmar_pendencias: true }); m = await moverInicial(banco, i1.id, { etapa: 'protocolada', confirmar_pendencias: true, protocolo_data: '2026-10-10' })
ok(m.etapa === 'protocolada' && m.protocolo_data === '2026-10-10', 'protocolar sem número é permitido (o número pode chegar depois)')
ok(!!(await lanca(() => moverInicial(banco, i1.id, { etapa: 'xyz' }), 'Etapa')) && !!(await lanca(() => moverInicial(banco, 999, { etapa: 'produzir' }), 'não encontrada')), 'etapa inválida e inicial inexistente')
const i2 = await criarInicial(banco, U, { cliente: 'Pedro', etapa: 'redacao' })
m = await moverInicial(banco, i2.id, { etapa: 'pronta' }); ok(m.etapa === 'pronta', 'sem pendências, avança sem confirmar')
await excluirInicial(banco, i2.id); ok((await listarIniciais(banco)).length === 1, 'excluir')
console.log(falhas ? `\n${falhas} FALHA(S)` : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
