# Revisão crítica e estrutural do CRM (artefato)

Critério: cada tela precisa **decidir algo** ou **registrar algo que alimenta outra tela**. O que só repetia informação foi fundido ou removido.

## 1. Menu: de 22 itens para 10

| Antes | Depois | Por quê |
|---|---|---|
| Dashboard, Hoje, Secretária | **Início** | Três páginas mostravam a mesma lista (tarefas, prazos, intimações, leads). Agora há uma: o que pede atenção + indicadores do dia. |
| Agenda, Tarefas, Prazos, Intimações | **Agenda** (abas Calendário · Tarefas · Prazos · Intimações) | São “o que fazer e quando”. A intimação vira prazo, o prazo vira tarefa de preparação: um fluxo, uma tela. |
| Leads, Clientes, Remarketing | **Pessoas** (abas Funil · Clientes · Remarketing) | Mesma entidade (contato) em três momentos. |
| Mensagens + conversa da ficha + e-mail da Secretária | **Comunicação** (Caixa · Modelos) | Um só histórico por pessoa/demanda, em qualquer canal. |
| Demandas, Processos, Documentos, Iniciais (Secretária) | **Demandas** (abas) | Processo, documento e petição inicial são filhos da demanda. |
| Padrões operacionais + Mapa operacional | **Padrões operacionais** (Passo a passo · Fluxo do CRM) | Os dois explicam o fluxo. |
| Configurações + Auditoria + integrações | **Configurações** (Escritório · Conexões e IA · Auditoria) | Área administrativa única. |
| Financeiro (3 abas) + Relatórios | **Financeiro** (Honorários · Contas) + **Relatórios** | “Gestão e preço” saiu da aba: vira parâmetros recolhíveis e o piso aparece no formulário de honorário, onde se decide o valor. |

Rotas antigas (`#hoje`, `#tarefas`, `#leads`…) continuam funcionando e levam à aba certa.

## 2. Removido por não ter utilidade real

- Login, recuperar senha e política de privacidade falsos (o acesso é o do compartilhamento do artefato; agora o papel vem de `isOwner()`).
- Troca manual de papel Admin/Equipe (era simulação).
- “Criar pasta no Drive (simulado)” → agora só vincula o link da pasta (dado real).
- “Gerar procuração/contrato (Word)” que apenas mostrava um aviso.
- “Sincronização com Google Agenda simulada” → substituída por link do Google Agenda e arquivo .ics (reais).
- Painéis duplicados do Dashboard (funil, carteira, prazos 7 dias, documentos pendentes): já existem em Pessoas, Relatórios, Agenda e Demandas.
- “Demais fluxos” do Mapa operacional (repetia o menu); lista “Integrações: simulado” (virou o Mapa de capacidades).
- Tabela `mensagens` separada e anotações “WhatsApp/E-mail/Ligação/Reunião” em Atividades: tudo em **uma** coleção `comunicacoes`.

## 3. Acrescentado (cada item resolve um problema real)

| Funcionalidade | Problema | Liga-se a |
|---|---|---|
| Comunicação unificada com vínculo a demanda | Histórico espalhado em WhatsApp, e-mail e ligações | Pessoa, Demanda, Início (sem resposta), “último contato” |
| Último contato derivado | Ninguém digitava; alerta “cliente sem novidade” ficava desatualizado | Início |
| Linha do tempo única (pessoa e demanda) | Acompanhar a demanda exigia abrir 4 telas | Comunicações, andamentos, notas, anotações |
| Tarefa de preparação a partir do prazo | Prazo sem trabalho prévio agendado | Agenda, Início |
| Link do Google Agenda e .ics | Levar prazo/audiência para o celular | Agenda |
| Ler texto de intimação (CNJ validado, data, tipo) | Digitar cada intimação à mão | Processos, Intimações, Prazos |

## 4. E-mail, WhatsApp e IA — o que é real

Legenda: **REAL** · **SIMULADA** · **POSSÍVEL COM INTEGRAÇÃO** · **NÃO VIÁVEL AQUI**. A tabela completa está em *Configurações › Conexões e IA* (e testa Gmail e IA com um clique).

**E-mail** — REAL via conector Gmail da conta (você autoriza ao usar): buscar e importar e-mails do cliente (dedup por id), ligar à demanda, ver anexos (nome), criar rascunho, enviar (com confirmação e anexos até 8 MB), registro automático do envio. Não viável: aviso em segundo plano com o CRM fechado. *Testado com o conector simulado; falta teste ao vivo com a sua conta.*

**WhatsApp** — REAL: abrir a conversa com a mensagem pronta (wa.me), modelos com variáveis, registrar enviadas/recebidas, histórico por cliente/demanda. POSSÍVEL COM INTEGRAÇÃO: envio/recebimento automático (WhatsApp Business Platform + servidor com webhook; o CRM do site já tem a base). NÃO VIÁVEL: receber mensagens só com o artefato (sem endereço público nem credencial segura).

**IA** — REAL (IA da conta Claude, consentimento, desligada por padrão, sem CPF/RG/telefone/e-mail no pedido): resumo de pessoa e de demanda, rascunho de resposta (WhatsApp/e-mail) com as regras da OAB, comando em linguagem natural (a IA propõe, você aplica, tudo auditado), leitura de texto de intimação. POSSÍVEL: análise de PDF/foto de documentos (não implementada). *Testada com IA simulada; falta teste ao vivo.*

## 5. Priorização (matriz de decisão)

Critérios: impacto na operação, frequência, ligação com o fluxo central (cadastro → atendimento → demanda → tarefas → documentos → comunicação → acompanhamento → conclusão → histórico), redução de complexidade, dependências, esforço, viabilidade e risco. Regra: *o que mais melhora a operação com o menor aumento de complexidade*.

Viabilidade: **Real** = funciona no ambiente atual · **Pequena adaptação** · **Integração** · **Backend** · **Demonstrável** · **Não viável**.

| Funcionalidade | Problema que resolve | Impacto | Frequência | Esforço | Dependências | Viabilidade | Prioridade | Decisão |
|---|---|---|---|---|---|---|---|---|
| Fusão do menu (22→10) | Mesma informação em 3–4 telas | Alto | Diária | Média | — | Real | **P0** | Feito |
| Comunicação unificada (por pessoa e demanda) | Histórico espalhado por canal | Alto | Várias vezes/dia | Média | Modelo de dados | Real | **P0** | Feito |
| Procuração, contrato e relatório semanal com os textos do escritório | ~20–30 min por cliente novo; erro de digitação | Alto | Por cliente novo / semanal | Média | Qualificação, honorário | Real (.doc) | **P1** | **Feito agora** |
| Atualização para a cliente a partir da demanda | Escrever do zero o “como está meu caso” | Alto | Semanal | Baixa | Comunicação, relatório | Real | **P1** | **Feito agora** |
| Último contato derivado + alerta “sem novidade” | Prazo de contato esquecido | Alto | Diária | Baixa | Comunicação | Real | **P1** | Feito |
| Linha do tempo única (pessoa e demanda) | Acompanhar exigia abrir 4 telas | Médio-alto | Diária | Baixa | Comunicação | Real | **P1** | Feito |
| Tarefa de preparação a partir do prazo | Prazo sem trabalho prévio agendado | Alto (risco) | Semanal | Baixa | Prazos, tarefas | Real | **P1** | Feito |
| Leitura de texto de intimação (CNJ, data, tipo) | Digitar cada intimação | Médio | Semanal | Baixa | Processos | Real | **P1** | Feito (local; IA só refina) |
| E-mail: buscar/importar do Gmail e ligar à demanda | E-mails fora do histórico | Médio | Semanal | Média | Comunicação | Integração (conector) | **P2** | Feito, não testado ao vivo |
| E-mail: rascunho e envio | Sair do CRM para responder | Médio | Semanal | Média | Acima | Integração | **P2** | Feito (envio com confirmação) |
| IA: rascunho de resposta | Responder mais rápido | Médio | Diária | Baixa | Comunicação | Integração (sample) | **P2** | Feito (desligada por padrão) |
| IA: resumo de pessoa/demanda | Retomar caso parado | Médio | Semanal | Baixa | Linha do tempo | Integração | **P2** | Feito |
| Anexar arquivo ao documento (armazenamento do artefato) | Documento sem arquivo | Médio | Diária | Média | Decisão LGPD sobre armazenar | Pequena adaptação | **P2** | **Adiado**: hoje vale o link do Drive |
| Link do Google Agenda / .ics | Levar prazo ao celular | Baixo-médio | Eventual | Baixa | — | Real | **P3** | Mantido (custo mínimo) |
| IA: comando em linguagem natural | Criar tarefa por frase | Baixo | Eventual | Média | Confirmação | Integração | **P3** | **Rebaixado**: saiu do topo do Início; passou a ser “Pedir à IA” dentro da busca (uma barra só) |
| Gráfico de receita no Início | Ver recebimentos | Baixo | Eventual | — | — | Real | **P4** | **Removido** (já existe em Financeiro) |
| Envio/recebimento automático no WhatsApp | Conversa centralizada de verdade | Alto | Várias/dia | Alta | Servidor, API oficial, webhook | Backend | **P2** (no CRM do site) / **P4** no artefato | Arquitetura pronta: toda comunicação tem `origem` e `ext_id`; falta o servidor |
| IA lendo PDF/foto de documento | Preencher qualificação | Médio | Por cliente novo | Alta | Imagens, conversão de PDF | Integração | **P4** | Não agora |
| Regras de automação configuráveis | Fluxos sob medida | Baixo | Rara | Alta | Todo o resto estável | Backend | **P4** | Não agora |
| Importar contatos (CSV) | Carga inicial | Baixo | Rara | Média | — | Real | **P3** | Não agora |
| Notificação push/SMS | Avisos fora da tela | Médio | Diária | — | — | Não viável | **P4** | O sino e o Início cobrem com o CRM aberto |
| Multiusuário com perfis | Equipe | Baixo (escritório solo) | — | Alta | Backend | Backend | **P4** | Não agora |

Efeito da priorização nesta rodada: dois itens P1 que faltavam foram implementados (peças e atualização à cliente); um item “de tecnologia” (comando por IA) foi rebaixado e fundido à busca; um painel de baixo valor foi removido.

## 6. Auditoria do que foi removido (funcionalidades que funcionavam)

Comparação entre a primeira versão completa (commit `abcf508`) e a versão após a revisão. **Nada foi restaurado automaticamente**; abaixo, o que existia, onde estava, por que saiu, onde está hoje e a recomendação.

| # | O que fazia | Onde estava | Por que saiu | Hoje | Deveria voltar? |
|---|---|---|---|---|---|
| 1 | “O que você precisa?” achava **tarefas, prazos/compromissos e petições iniciais** (além de pessoas) e entendia frases sobre iniciais (“quais iniciais atrasadas”, “recebi o CNIS da Beatriz”, “avançar”, “falta CTPS”) com o interpretador local `INI.interpretarInicial` | Secretária › Início | Fundi a Secretária ao Início e a busca ao cabeçalho | A busca do cabeçalho só encontra pessoas, demandas e processos; o interpretador de iniciais não foi religado | **Sim** (P1): perda real de alcance de busca |
| 2 | **Sequência de follow-up**: ao registrar a mensagem enviada, avançava a próxima ação (24h → 7 dias → 14 dias; convite → pagamento; feedback → proposta em 2 dias úteis) | Modal “Mensagem” (Hoje/Ficha) | Apaguei o modal ao unificar a comunicação e não portei essa regra | Só “Registrar andamento” ainda avança a sequência; enviar pela Comunicação não avança | **Sim** (P0/P1): quebra o fluxo central do Hoje |
| 3 | **Iniciais atrasadas ou com data em até 2 dias apareciam na faixa “Hoje”** (e no número da aba) | Secretária › Início | A Secretária foi fundida e a faixa não foi levada | O número aparece na aba “Petições iniciais”, mas o Início não lista as iniciais | **Sim** (P1): era requisito explícito da etapa 4 |
| 4 | **Panorama de documentos pendentes de todas as demandas** (quem deve o quê) | Dashboard e Documentos | Removi o painel do Dashboard; em Documentos o resumo mostra só as 3 primeiras demandas | Há contador na aba e o checklist por demanda, mas não a lista geral | **Sim** (P1) |
| 5 | **Gráfico de recebido nos últimos 6 meses** | Dashboard | Disse que “já existe em Financeiro”. **Não existia: foi um erro meu** | Não existe em lugar nenhum | **Sim**, no Financeiro (P3, custo mínimo) |
| 6 | **Prazos dos próximos 7 dias** com botão “Cumprido” | Dashboard | Painel duplicado | Hoje mostra prazos até 2 dias; Agenda › Prazos lista tudo | Opcional (P3): mini-painel no Início |
| 7 | **Botão WhatsApp** direto na ficha do cliente | Cabeçalho da ficha | Substituído por “Comunicar” | Um clique a mais (aba Comunicação) | Opcional (P3): voltar como ação rápida |
| 8 | Página de **privacidade/LGPD** (texto e link da política) | Tela pública | Fiz parte da remoção do login | Só o aviso no rodapé | Opcional (P3) |
| — | Login/recuperar senha, troca de papel, “criar pasta (simulado)”, “Word” que só avisava, “Google Agenda simulado” | vários | Eram simulações | Substituídos por funções reais ou removidos | Não |
| — | Tabela de equipe/permissões, painéis duplicados (funil, carteira) | Configurações / Dashboard | Documentação ou duplicação | Perfil explica o acesso; funil e carteira estão em Pessoas e Relatórios | Não |

Funcionalidades preservadas e acessíveis: todas as de Agenda, Pessoas, Demandas (processos, partes, análise, documentos), Financeiro (inclusive piso de preço), Relatórios (inclusive revisão por amostragem), Formulários, Padrões operacionais e Configurações.

## 7. Barra de navegação como central de operação

- **Estrutura**: 5 grupos → 10 módulos → 29 abas. Cada módulo é uma tela completa com abas (lista, busca, filtros, criação, edição, histórico, relatórios). A barra mostra os módulos; as abas aparecem como atalhos diretos no módulo aberto ou nos que você expandir pela seta (a escolha é lembrada).
- **Acesso imediato**: botão **+ Novo** (9 ações rápidas: contato, comunicação, formulário, tarefa, prazo/compromisso, intimação, demanda, petição inicial, honorário) e **Buscar ou pedir** (`Ctrl K`).
- **Badges**: só onde há ação pendente (Início, tarefas atrasadas, prazos em 7 dias, intimações, leads novos, remarketing pronto, não lidas, demandas com documento pendente, iniciais, contas vencidas). Módulo recolhido mostra a soma das abas.
- **Mais**: perfil, link público de formulário, exportar dados (administradora).
- **Novo item com função real**: *Configurações › Automações* — 7 regras que o CRM já executava agora são ajustáveis (cadência por etapa, dias sem novidade, antecedência de prazos, intervalo do remarketing, checklist ao abrir demanda, aniversários, tarefa de preparação) e 8 regras fixas ficam listadas. Cada mudança altera o comportamento e vai para a Auditoria.
- **Fora da barra de propósito**: Perfil (cabeçalho e “Mais”), Auditoria (aba de Configurações), Calculadora de prazos (aba Prazos), Qualidade (aba de Relatórios).
