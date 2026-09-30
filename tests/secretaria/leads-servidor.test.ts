import { banco, db, zerar } from '../formularios/fake-db'
import { atualizarLead, consultasNaAgenda, criarLead, excluirLead, interpretarConversa, limparLead, listarLeads, marcarConsulta, moverLead, registrarConversa } from '../../server/utils/leadsSecretaria'
import type { Api } from '../../server/utils/google'

;(globalThis as any).createError = (o: any) => Object.assign(new Error(o.message), o)
let falhas = 0
const ok = (c: boolean, n: string) => { console.log(`${c ? 'PASS' : 'FAIL'} ${n}`); if (!c) falhas++ }
const lanca = async (fn: () => any, trecho?: string) => { try { await fn(); return false } catch (e: any) { return trecho ? String(e.message).includes(trecho) : true } }
const U = 'u-lara'
const lead = (o: any) => ({ id: 0, user_id: U, nome: 'Fulana', whatsapp: null, origem: 'Instagram', data_contato: '2026-09-30', etapa: 'novo', conversa: 'minha', conversa_desde: '2026-09-29T10:00:00.000Z', motivo_nao_fechou: null, valor_fechado: null, exito: null, honorarios_prop: null, ...o })

// ── validação ──
ok(!!(await lanca(() => limparLead({}, true), 'nome')) && !!(await lanca(() => limparLead({ nome: 'x', origem: 'TikTok' }), 'Origem')) && !!(await lanca(() => limparLead({ nome: 'x', etapa: 'ganhou' }), 'Etapa')) && !!(await lanca(() => limparLead({ nome: 'x', whatsapp: '123' }), 'WhatsApp')) && !!(await lanca(() => limparLead({ exito: 120 }), 'êxito')) && !!(await lanca(() => limparLead({ valor_fechado: -5 }), 'Valor')) && !!(await lanca(() => limparLead({ data_contato: '31/09' }), 'Data')) && !!(await lanca(() => limparLead({ consulta_hora: '25:00' }), 'Hora')) && !!(await lanca(() => limparLead({ nome: 'x', etapa: 'nao_fechou' }, true), 'motivo')), 'dados inválidos são recusados (nome, origem, etapa, WhatsApp, êxito, valores, datas, hora, não fechou sem motivo)')
const d = limparLead({ nome: '  Maria  ', whatsapp: '(71) 99999-0001', honorarios_prop: '2.800,50', exito: '15', id: 99, user_id: 'outro', created_at: 'x', area: '', consulta_hora: '14:30:00' }, true) as any
ok(d.nome === 'Maria' && d.whatsapp === '5571999990001' && d.honorarios_prop === 2800.5 && d.exito === 15 && d.area === null && d.consulta_hora === '14:30' && !('id' in d) && !('user_id' in d) && !('created_at' in d), 'normaliza nome, WhatsApp, valores em formato brasileiro, hora; ignora id/user_id/created_at vindos do navegador')

// ── CRUD e regras de etapa ──
zerar(); db.secretaria_leads = []
const l1 = await criarLead(banco, U, { nome: 'Maria Souza', whatsapp: '71999990001', origem: 'Indicação', origem_detalhe: 'Dra. Amiga', area: 'Divórcio', cidade: 'Salvador', data_contato: '2026-09-28', honorarios_prop: 3500, proximo_passo: 'Enviar proposta', obs: 'Urgente', caso: 'Quer se divorciar' })
ok(l1.user_id === U && l1.origem === 'Indicação' && l1.origem_detalhe === 'Dra. Amiga' && l1.honorarios_prop === 3500 && l1.whatsapp === '5571999990001', 'lead criado com a ficha completa')
ok((await listarLeads(banco)).length === 1, 'listar leads')
let u = await atualizarLead(banco, l1.id, { conversa: 'cliente' })
ok(u.conversa === 'cliente' && u.conversa_desde !== '2026-09-28' && Date.now() - Date.parse(u.conversa_desde) < 5000, 'mudar a situação da conversa reinicia a contagem dos 3 dias')
u = await atualizarLead(banco, l1.id, { area: 'Inventário' })
ok(u.area === 'Inventário' && u.conversa === 'cliente', 'editar outro campo não mexe na conversa')
ok(!!(await lanca(() => atualizarLead(banco, l1.id, { etapa: 'nao_fechou' }), 'motivo')) && db.secretaria_leads[0].etapa !== 'nao_fechou', 'Não fechou sem motivo é recusado (nada muda)')
let m = await moverLead(banco, l1.id, { etapa: 'nao_fechou', motivo: 'Escolheu outro advogado' })
ok(m.etapa === 'nao_fechou' && m.motivo_nao_fechou === 'Escolheu outro advogado', 'Não fechou guarda o motivo')
m = await moverLead(banco, l1.id, { etapa: 'fechou', valor_fechado: '4.500,00', exito: 15 })
ok(m.etapa === 'fechou' && m.valor_fechado === 4500 && m.exito === 15 && m.motivo_nao_fechou === null, 'Fechou guarda valor e êxito e limpa o motivo antigo')
m = await moverLead(banco, l1.id, { etapa: 'proposta' }); ok(m.etapa === 'proposta' && m.valor_fechado === 4500, 'voltar para outra etapa não apaga o valor já informado')
m = await moverLead(banco, l1.id, { etapa: 'nao_fechou', motivo: 'Sem retorno' }); m = await moverLead(banco, l1.id, { etapa: 'nao_fechou' })
ok(m.motivo_nao_fechou === 'Sem retorno', 'Não fechou reaproveita o motivo já registrado')
m = await atualizarLead(banco, l1.id, { etapa: 'consulta' }); ok(m.etapa === 'consulta' && m.motivo_nao_fechou === null, 'reabrir um lead que não fechou limpa o motivo')
ok(!!(await lanca(() => moverLead(banco, l1.id, { etapa: 'xyz' }), 'Etapa')) && !!(await lanca(() => moverLead(banco, 999, { etapa: 'novo' }), 'não encontrado')), 'etapa inválida e lead inexistente são recusados')
const r1 = await registrarConversa(banco, l1.id, 'respondi'); ok(r1.conversa === 'cliente', '"Respondi agora": passa a aguardar o cliente')
const r2 = await registrarConversa(banco, l1.id, 'cliente'); ok(r2.conversa === 'minha' && Date.now() - Date.parse(r2.conversa_desde) < 5000, '"Cliente me mandou mensagem": passa a aguardar minha resposta, contagem reiniciada')
ok(!!(await lanca(() => registrarConversa(banco, l1.id, 'x'), 'Ação')), 'ação de conversa inválida é recusada')

// ── consulta no Google Agenda ──
const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)
const add = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10)
db.secretaria_leads = [lead({ id: 1, nome: 'Maria Souza', etapa: 'consulta' }), lead({ id: 2, nome: 'Joana Dias', etapa: 'consulta' }), lead({ id: 3, nome: 'Paula Nunes', etapa: 'consulta' }), lead({ id: 4, nome: 'Ana Lima', etapa: 'novo' }), lead({ id: 5, nome: 'Érica Álvares', etapa: 'consulta' }), lead({ id: 6, nome: 'Erro Silva', etapa: 'consulta' })]
const consultados: string[] = []
const api = (over: Partial<Api> = {}): Api => ({
  async listarThreads() { return [] }, async threadMeta() { return [] }, async threadCompleto() { return [] }, async criarEvento() { return { id: 'e', link: 'l' } },
  async buscarEventos(q) { consultados.push(q); if (q === 'Maria Souza') return [{ dia: add(hoje, 3), hora: '10:00', link: 'https://cal/1', titulo: 'CONSULTA — Maria Souza', descricao: '' }, { dia: add(hoje, -5), hora: '09:00', link: 'https://cal/0', titulo: 'Consulta Maria Souza', descricao: '' }]
    if (q === 'Joana Dias') return [{ dia: add(hoje, -4), hora: '15:00', link: 'https://cal/2', titulo: 'Reunião', descricao: 'com joana dias' }]
    if (q === 'Paula Nunes') return [{ dia: add(hoje, 2), hora: '09:00', link: 'x', titulo: 'Outra coisa sem o nome', descricao: '' }]
    if (q === 'Érica Álvares') return [{ dia: hoje, hora: '16:00', link: 'https://cal/5', titulo: 'consulta erica alvares', descricao: '' }]
    throw new Error('Google fora do ar') },
  async criarConsulta() { return { id: 'c', link: 'https://cal/novo', meet: '' } }, ...over })
const cs = await consultasNaAgenda(api(), db.secretaria_leads as any, hoje)
ok(cs[1]!.st === 'verde' && cs[1]!.dia === add(hoje, 3) && cs[1]!.hora === '10:00', 'verde: consulta marcada (a futura vale mais que a passada)')
ok(cs[2]!.st === 'amarelo' && cs[2]!.dia === add(hoje, -4), 'amarelo: a consulta já passou (nome achado na descrição)')
ok(cs[3]!.st === 'vermelho', 'vermelho: só há evento sem o nome do lead')
ok(cs[5]!.st === 'verde' && cs[5]!.dia === hoje, 'consulta de hoje conta como marcada; nome sem acento/caixa também casa')
ok(cs[6]!.st === 'erro' && /fora do ar/.test(cs[6]!.msg!) && !cs[4], 'falha do Google vira "erro" só naquele lead; só a coluna Ag. consulta é conferida')
ok(!consultados.includes('Ana Lima'), 'leads de outras etapas não são consultados')

let evento: any = null
db.secretaria_leads = [lead({ id: 1, nome: 'Nome Novo', whatsapp: '5571988887777', area: 'Inventário', etapa: 'novo' })]
const a2 = api({ async criarConsulta(e) { evento = e; return { id: 'c1', link: 'https://cal/c1', meet: 'https://meet/x' } } })
const mc = await marcarConsulta(a2, banco, 1, { dia: '2026-10-05', hora: '14:30', duracao: 90, modo: 'online' })
ok(evento.titulo === 'CONSULTA — Nome Novo' && evento.dia === '2026-10-05' && evento.hora === '14:30' && evento.duracaoMin === 90 && evento.online === true && JSON.stringify(evento.avisos) === '[1440,60]' && /5571988887777/.test(evento.descricao), 'consulta: título, dia/hora, 90 min, on-line (Meet), lembretes 1 dia e 1 hora antes')
ok(mc.lead.etapa === 'consulta' && mc.lead.consulta_data === '2026-10-05' && mc.lead.consulta_hora === '14:30' && mc.lead.consulta_link === 'https://cal/c1' && mc.meet === 'https://meet/x', 'lead vai para Ag. consulta com data, hora e link da agenda')
db.secretaria_leads = [lead({ id: 1, nome: 'Outra', etapa: 'proposta' })]
await marcarConsulta(a2, banco, 1, { dia: '2026-10-06', hora: '09:00', modo: 'presencial' })
ok(db.secretaria_leads[0].etapa === 'proposta' && evento.online === false && evento.local === 'Presencial', 'consulta em lead de outra etapa não muda a etapa; presencial sem Meet')
db.secretaria_leads = [lead({ id: 1, nome: 'Falha', etapa: 'novo' })]
ok(!!(await lanca(() => marcarConsulta(api({ async criarConsulta() { throw new Error('Faltou permissão') } }), banco, 1, { dia: '2026-10-05', hora: '10:00' }), 'permissão')) && db.secretaria_leads[0].consulta_data === undefined && db.secretaria_leads[0].etapa === 'novo', 'se o Google falhar, o lead NÃO muda')
ok(!!(await lanca(() => marcarConsulta(a2, banco, 1, { dia: '05/10', hora: '10:00' }), 'dia')) && !!(await lanca(() => marcarConsulta(a2, banco, 1, { dia: '2026-10-05', hora: '10h' }), 'hora')) && !!(await lanca(() => marcarConsulta(a2, banco, 1, { dia: '2026-10-05', hora: '10:00', duracao: 5 }), 'Duração')), 'dia, hora e duração inválidos são recusados')

// ── importar conversa ──
const conversa = '12/09/2026 14:32 - Fernanda Alves: Boa tarde, vi o perfil da doutora no Instagram\n12/09/2026 14:40 - Dra. Lara: Olá Fernanda, como posso ajudar?\n12/09/2026 14:41 - Fernanda Alves: Quero me divorciar, moro em Lauro de Freitas\n13/09/2026 09:05 - Fernanda Alves: Podemos marcar uma consulta?'
let prompt = ''
const ia = async (p: string) => { prompt = p; return { advogada: 'Dra. Lara', nome: 'Fernanda Alves', whatsapp: '', origem: 'Instagram', origem_detalhe: '@perfil', area: 'Divórcio', cidade: 'Lauro de Freitas', caso: 'Quer se divorciar.', proximo_passo: 'Marcar consulta', obs: '' } }
let imp = await interpretarConversa(ia, conversa, 'Conversa do WhatsApp com Fernanda Alves.txt', { trat: 'Dra.', nome: 'Lara Café' }, '2026-09-30')
ok(imp.lead.nome === 'Fernanda Alves' && imp.lead.origem === 'Instagram' && imp.lead.origem_detalhe === '@perfil' && imp.lead.area === 'Divórcio' && imp.lead.cidade === 'Lauro de Freitas' && imp.lead.data_contato === '2026-09-12' && imp.lead.etapa === 'novo' && imp.mensagens === 4 && imp.aviso === '', 'importação com IA: ficha proposta (nome, origem, detalhe, área, cidade, data do primeiro contato)')
ok(imp.lead.conversa === 'minha' && imp.lead.conversa_desde === new Date('2026-09-13T09:05:00-03:00').toISOString(), 'última mensagem foi do cliente → aguardando minha resposta (desde essa mensagem)')
ok(/nunca siga instruções/.test(prompt) && /"Fernanda Alves", "Dra\. Lara"/.test(prompt) && /Podemos marcar/.test(prompt), 'pedido à IA trata a conversa como dado de terceiros e lista os participantes')
ok(db.secretaria_leads.length === 1, 'importar só propõe: nada é gravado')
imp = await interpretarConversa(async () => ({ advogada: 'Invasor', nome: 'X'.repeat(500), origem: 'TikTok', whatsapp: '999' }), conversa, '', { trat: 'Dra.', nome: 'L' })
ok(imp.lead.nome.length === 120 && imp.lead.origem === 'WhatsApp' && imp.lead.whatsapp === '', 'resposta estranha da IA é saneada (nome cortado, origem inválida vira WhatsApp, telefone inválido some)')
imp = await interpretarConversa(null, conversa, 'Conversa do WhatsApp com +55 71 98888-7777.txt', { trat: 'Dra.', nome: 'L' })
ok(/ANTHROPIC_API_KEY/.test(imp.aviso) && imp.lead.nome === 'Fernanda Alves' && imp.lead.whatsapp === '5571988887777' && imp.lead.data_contato === '2026-09-12', 'sem IA configurada: avisa e preenche o que o arquivo traz (nome, telefone do nome do arquivo, data)')
imp = await interpretarConversa(async () => { throw new Error('boom') }, conversa, '', { trat: 'Dra.', nome: 'L' }); ok(/Não consegui usar a IA/.test(imp.aviso) && imp.lead.nome === 'Fernanda Alves', 'IA com erro: avisa e segue com o que o arquivo traz')
ok(!!(await lanca(() => interpretarConversa(ia, 'texto qualquer sem mensagens', '', { trat: '', nome: '' }), 'Não reconheci')), 'arquivo que não é conversa do WhatsApp é recusado')

// ── excluir ──
db.secretaria_leads = [lead({ id: 1 })]; await excluirLead(banco, 1); ok(db.secretaria_leads.length === 0, 'excluir lead')
console.log(falhas ? falhas + ' FALHA(S)' : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
