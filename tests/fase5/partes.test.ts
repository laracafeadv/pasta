import { banco, db, zerar } from '../formularios/fake-db'
import { adicionarParte, atualizarParte, removerParte, vincularPartePessoa } from '../../server/utils/partes'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, nome: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${nome}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return null } catch (e: any) { return trecho ? (String(e.message).includes(trecho) ? e : null) : e } }
const ev = {} as any
const nPessoas = () => db.contatos.length

zerar()
// Pessoa A (cliente) e Beto (já cadastrado como pessoa relacionada, telefone 71999990002)
db.contatos = [
  { id: 1, nome: 'Ana Souza', telefone: '5571999990001', etapa: 'ativo' },
  { id: 2, nome: 'Beto Souza', telefone: '5571999990002', etapa: 'relacionado' },
  { id: 3, nome: 'Carlos Lima', telefone: '5571999990003', etapa: 'novo' },
]
db.casos = [{ id: 1, contato_id: 1, titulo: 'Inventário de João Souza', tipo: 'extrajudicial', status: 'ativo' }, { id: 2, contato_id: 3, titulo: 'Outra demanda', tipo: 'consultivo', status: 'ativo' }]
db.processos = [{ id: 10, caso_id: 1, contato_id: 1, natureza: 'extrajudicial' }, { id: 20, caso_id: 2, contato_id: 3, natureza: 'extrajudicial' }]
db.partes = []; db.atividades = []

// ── Cenário obrigatório: inventário da pessoa A + três herdeiros, um já existente ──
const h1 = await adicionarParte(ev, banco, { caso_id: 1, pessoa_id: 2, papel: 'Herdeiro' }, 'u1')
ok(h1.parte.contato_id === 2 && h1.pessoa.reaproveitada && !h1.pessoa.criada && nPessoas() === 3, 'herdeiro já cadastrado: vinculado ao registro existente, nenhuma pessoa nova')
const h2 = await adicionarParte(ev, banco, { caso_id: 1, nova_pessoa: { nome: 'Denise Souza', telefone: '(71) 99999-0004' }, papel: 'Herdeiro' }, 'u1')
ok(h2.pessoa.criada && nPessoas() === 4 && db.contatos[3].etapa === 'relacionado' && db.contatos[3].telefone === '5571999990004' && h2.parte.contato_id === db.contatos[3].id, 'herdeiro novo com telefone: cadastrado UMA vez como "pessoa cadastrada" (fora do funil)')
const h3 = await adicionarParte(ev, banco, { caso_id: 1, nova_pessoa: { nome: 'Elisa Souza' }, papel: 'Herdeiro' }, 'u1')
ok(h3.pessoa.sem_cadastro && h3.parte.contato_id === null && h3.parte.nome === 'Elisa Souza' && nPessoas() === 4, 'herdeiro sem telefone: fica como parte sem cadastro (não cria pessoa incompleta)')
ok(db.partes.filter((p: any) => p.caso_id === 1).length === 3, 'três herdeiros na demanda')

// ── Mesma pessoa por telefone: reaproveita, não duplica ──
const t1 = await adicionarParte(ev, banco, { caso_id: 2, nova_pessoa: { nome: 'Beto S.', telefone: '71 99999-0002' }, papel: 'Interessado' }, 'u1')
ok(t1.parte.contato_id === 2 && t1.pessoa.reaproveitada && nPessoas() === 4, 'telefone já cadastrado (mesmo digitado com máscara) → usa a pessoa existente')

// ── Mesmo nome: pergunta antes de criar ──
const e409 = await lanca(() => adicionarParte(ev, banco, { caso_id: 2, nova_pessoa: { nome: 'beto souza', telefone: '71988887777' }, papel: 'Interessado' }, 'u1'))
ok(e409?.statusCode === 409 && e409.data?.candidatas?.[0]?.id === 2 && nPessoas() === 4, 'nome idêntico a alguém cadastrado (sem acento/caixa) → 409 com a candidata, nada criado')
const conf = await adicionarParte(ev, banco, { caso_id: 2, nova_pessoa: { nome: 'beto souza', telefone: '71988887777' }, confirmar_nova: true, papel: 'Interessado' }, 'u1')
ok(conf.pessoa.criada && nPessoas() === 5, 'confirmando que é outra pessoa, cadastra')

// ── Mesma pessoa duas vezes na demanda ──
ok(!!(await lanca(() => adicionarParte(ev, banco, { caso_id: 1, pessoa_id: 2, papel: 'Cônjuge' }, 'u1'), 'já está nesta demanda')), 'a mesma pessoa não entra duas vezes na mesma demanda')
ok(!!(await lanca(() => adicionarParte(ev, banco, { caso_id: 1, pessoa_id: 999, papel: 'Herdeiro' }, 'u1'), 'não encontrada')), 'pessoa inexistente é recusada')
ok(!!(await lanca(() => adicionarParte(ev, banco, { caso_id: 999, pessoa_id: 2 }, 'u1'), 'Demanda')), 'demanda inexistente é recusada')

// ── Processo/procedimento da demanda ──
ok(!!(await lanca(() => adicionarParte(ev, banco, { caso_id: 1, pessoa_id: 3, processo_id: 20 }, 'u1'), 'não pertence')), 'processo de outra demanda é recusado')
const pp = await adicionarParte(ev, banco, { caso_id: 1, pessoa_id: 3, papel: 'Testemunha', processo_id: 10 }, 'u1')
ok(pp.parte.processo_id === 10, 'parte ligada ao procedimento da demanda')
ok(!!(await lanca(() => atualizarParte(ev, banco, pp.parte.id, { processo_id: 20 }, 'u1'), 'não pertence')), 'editar para processo de outra demanda é recusado')

// ── Papel livre e edição ──
const ed = await atualizarParte(ev, banco, h1.parte.id, { papel: 'Inventariante', nome: 'HACK', observacao: 'nomeado' }, 'u1')
ok(ed.papel === 'Inventariante' && ed.nome === 'Beto Souza' && ed.observacao === 'nomeado', 'editar papel/observação; nome de pessoa cadastrada não é sobrescrito na parte')
ok(db.atividades.some((a: any) => /Herdeiro → Inventariante/.test(a.texto) && a.caso_id === 1), 'troca de papel registrada no histórico da demanda')
const outro = await adicionarParte(ev, banco, { caso_id: 2, pessoa_id: 1, papel: 'Procurador de honra' }, 'u1')
ok(outro.parte.papel === 'Procurador de honra', 'papel "outro" é aceito (texto livre)')

// ── Histórico nos dois lados ──
ok(db.atividades.some((a: any) => a.contato_id === 2 && a.caso_id == null && /Vinculada como Herdeiro.*Inventário/.test(a.texto)), 'a pessoa vinculada recebe registro no próprio histórico')
ok(db.atividades.some((a: any) => a.contato_id === 1 && a.caso_id === 1 && /Beto Souza \(Herdeiro\).*já cadastrada/.test(a.texto)), 'o histórico da demanda registra a parte adicionada')

// ── Vincular parte digitada à pessoa cadastrada ──
const semCad = h3.parte.id
const antes = nPessoas()
ok(!!(await lanca(() => vincularPartePessoa(ev, banco, semCad, { pessoa_id: 3 }, 'u1'), 'já está nesta demanda')), 'vincular a alguém que já está na demanda é recusado (evita parte duplicada)')
db.contatos.push({ id: 50, nome: 'Elisa Souza', telefone: '5571977776666', etapa: 'relacionado' })
const v2 = await vincularPartePessoa(ev, banco, semCad, { pessoa_id: 50 }, 'u1')
ok(v2.parte.contato_id === 50 && v2.parte.nome === 'Elisa Souza' && nPessoas() === antes + 1, 'parte sem cadastro vinculada a pessoa existente, sem criar outra')
ok(!!(await lanca(() => vincularPartePessoa(ev, banco, semCad, { pessoa_id: 50 }, 'u1'), 'já está vinculada')), 'parte já vinculada não é revinculada')

// ── Remover: desvincula, pessoa permanece ──
const total = nPessoas()
await removerParte(ev, banco, h1.parte.id, 'u1')
ok(!db.partes.some((p: any) => p.id === h1.parte.id) && nPessoas() === total && db.contatos.some((c: any) => c.id === 2), 'remover a parte NÃO apaga a pessoa')
ok(db.atividades.some((a: any) => /Parte removida.*a pessoa continua cadastrada/.test(a.texto)) && db.atividades.some((a: any) => a.contato_id === 2 && /Desvinculada da demanda/.test(a.texto)), 'remoção registrada nos dois históricos')
const rein = await adicionarParte(ev, banco, { caso_id: 1, pessoa_id: 2, papel: 'Herdeiro' }, 'u1')
ok(rein.parte.contato_id === 2 && db.contatos.filter((c: any) => c.nome === 'Beto Souza').length === 1, 'depois de desvincular, a mesma pessoa pode ser vinculada de novo (ainda um único cadastro)')

// ── Invariante final: ninguém duplicado ──
const tels = db.contatos.map((c: any) => c.telefone)
ok(new Set(tels).size === tels.length, 'invariante: nenhum telefone repetido no cadastro')
const pares = db.partes.filter((p: any) => p.contato_id).map((p: any) => `${p.caso_id}:${p.contato_id}`)
ok(new Set(pares).size === pares.length, 'invariante: nenhuma pessoa repetida dentro da mesma demanda')

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTodos os testes passaram')
process.exit(falhas ? 1 : 0)
