import { semanaInicio, situacaoConversa, aguardandoMinha, estatisticas, serieLeads, lerWhatsapp, conversaPelaUltima, normalizaFone, resumoParaIA } from '../../shared/utils/leadsSecretaria'
let falhas = 0
const eq = (n: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' → ' + JSON.stringify(a) + ' (esperado ' + JSON.stringify(b) + ')'}`); if (!ok) falhas++ }
const hoje = '2026-09-30'
const agora = Date.parse('2026-09-30T12:00:00Z'), h = (x: number) => new Date(agora - x * 3600e3).toISOString()
const L = (o: any) => ({ id: 1, nome: 'x', origem: 'Outro', etapa: 'novo', conversa: 'minha', conversa_desde: h(1), data_contato: hoje, ...o }) as any
eq('semana começa na segunda', semanaInicio(hoje), '2026-09-28'); eq('domingo pertence à semana anterior', semanaInicio('2026-09-27'), '2026-09-21')
eq('aguardando minha resposta', situacaoConversa(L({ conversa: 'minha', conversa_desde: h(200) }), agora), 'minha')
eq('aguardando o cliente (até 3 dias)', situacaoConversa(L({ conversa: 'cliente', conversa_desde: h(70) }), agora), 'cliente')
eq('sumiu depois de 3 dias', situacaoConversa(L({ etapa: 'proposta', conversa: 'cliente', conversa_desde: h(73) }), agora), 'sumiu')
eq('fechou/não fechou sem situação', [situacaoConversa(L({ etapa: 'fechou' }), agora), situacaoConversa(L({ etapa: 'nao_fechou', conversa: 'cliente', conversa_desde: h(999) }), agora)], [null, null])
const leads = [L({ etapa: 'fechou', origem: 'Instagram', data_contato: '2026-09-29' }), L({ etapa: 'novo', origem: 'Instagram', data_contato: '2026-09-30' }), L({ etapa: 'nao_fechou', origem: 'Indicação', data_contato: '2026-09-22' }), L({ etapa: 'fechou', origem: 'Indicação', data_contato: '2026-09-10' }), L({ etapa: 'consulta', origem: 'Google', data_contato: '2026-08-01' }), L({ etapa: 'novo', origem: 'TikTok', data_contato: '2026-09-28' })]
let e = estatisticas(leads, 'semana', hoje)
eq('semana: total, andamento, fechados, conversão', [e.total, e.andamento, e.fechados, e.conversao], [3, 2, 1, 33.3]); eq('nesta semana e semana passada', [e.nestaSemana, e.semanaPassada], [3, 1])
e = estatisticas(leads, '30d', hoje); eq('30 dias: 5 leads, 2 fechados = 40%', [e.total, e.fechados, e.conversao], [5, 2, 40])
e = estatisticas(leads, 'tudo', hoje); const ig = e.origens.find(o => o.origem === 'Instagram')!, ind = e.origens.find(o => o.origem === 'Indicação')!, ou = e.origens.find(o => o.origem === 'Outro')!
eq('tudo: origens com % e conversão', [e.total, ig.total, ig.pct, ig.conversao, ind.conversao, ou.total], [6, 2, 33.3, 50, 50, 1]); eq('soma dos % ≈ 100', Math.round(e.origens.reduce((s, o) => s + o.pct, 0)), 100)
eq('sem leads: zeros', estatisticas([], 'tudo', hoje).conversao, 0)
eq('aguardando minha (selo da aba)', aguardandoMinha([L({ etapa: 'novo', conversa: 'minha' }), L({ etapa: 'consulta', conversa: 'minha' }), L({ etapa: 'fechou', conversa: 'minha' }), L({ etapa: 'novo', conversa: 'cliente', conversa_desde: h(1) })], agora), 2)
eq('série por semana', serieLeads(leads, 'semana', hoje, 4).map(x => `${x.rotulo}:${x.n}`), ['07/09:1', '14/09:0', '21/09:1', '28/09:3'])
eq('série por mês', serieLeads(leads, 'mes', hoje, 3).map(x => `${x.rotulo}:${x.n}`), ['07/26:0', '08/26:1', '09/26:5'])
eq('fone: 10/11 dígitos ganham 55', [normalizaFone('(71) 99999-0001'), normalizaFone('+55 71 99999-0001'), normalizaFone('123')], ['5571999990001', '5571999990001', ''])
const txt = '12/09/2026 14:32 - Maria Souza: Boa tarde, vi o perfil da doutora\n12/09/2026 14:40 - Dra. Lara: Olá Maria, como posso ajudar?\n12/09/2026 14:41 - Maria Souza: Quero me divorciar\ne tenho 2 filhos\n12/09/2026 14:42 - As mensagens e chamadas são protegidas com a criptografia de ponta a ponta.\n[13/09/2026, 09:05:10] Maria Souza: Podemos marcar?'
const w = lerWhatsapp(txt)
eq('whatsapp: 4 mensagens, 2 autores, continuação de linha, sistema ignorado', [w.msgs.length, w.autores, w.msgs[2]!.texto], [4, ['Maria Souza', 'Dra. Lara'], 'Quero me divorciar\ne tenho 2 filhos'])
eq('whatsapp: formato com colchetes', w.msgs[3]!.ts, '2026-09-13T09:05:00-03:00')
eq('última do cliente → aguardando minha', conversaPelaUltima(w.msgs, 'Dra. Lara').conversa, 'minha'); eq('última da advogada → aguardando o cliente', conversaPelaUltima(w.msgs.slice(0, 2), 'Dra. Lara').conversa, 'cliente')
eq('resumo curto mantém as 4 mensagens', resumoParaIA(w.msgs).split('\n').length, 4)
eq('resumo grande é cortado (~12 mil)', resumoParaIA(Array.from({ length: 800 }, () => ({ ts: '2026-09-12T14:32:00-03:00', autor: 'A', texto: 'x'.repeat(300) }))).length < 12100, true)
console.log(falhas ? falhas + ' FALHA(S)' : 'Todos os testes passaram'); process.exit(falhas ? 1 : 0)
