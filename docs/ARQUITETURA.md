# Arquitetura do software de gestão do escritório

## Conceitos (o que cada um significa)

| Conceito | Definição | Tabela | Módulo |
|---|---|---|---|
| **Pessoa / Contato** | Qualquer pessoa conhecida pelo escritório, cadastrada uma única vez. Estados (etapa): novo → em qualificação → consulta agendada → consulta realizada → proposta enviada → cliente ativo → concluído (ou não contratou). "Pessoa cadastrada" (`relacionado`) é quem só aparece como parte/interessado: não é lead nem cliente e não entra em funil nem em Hoje. | `contatos` | Leads, Clientes, Mensagens |
| **Lead** | Pessoa ainda em atendimento comercial (etapas novo → proposta). Não é outra entidade: é a etapa do contato. | `contatos.etapa` | Leads |
| **Cliente** | Pessoa que contratou (etapa ativo / concluído). Continua cadastrada depois de tudo encerrado. | `contatos.etapa` | Clientes |
| **Demanda / Serviço** | O que o cliente contratou: consultiva, documental, extrajudicial ou judicial. Um cliente tem várias ao longo do tempo. Contém procedimento (checklist), informações próprias, documentos, prazos, tarefas, honorário e histórico. | `casos` (nome interno; "Caso" não existe mais na interface) | Demandas |
| **Processo** (judicial) | Execução formal em juízo: tribunal, vara, número CNJ, fase, valor, movimentações. Uma demanda tem 0..N. | `processos` (natureza = judicial) | Processos |
| **Procedimento** (extrajudicial) | Execução formal fora do Judiciário: cartório/serventia, protocolo, etapas, atos. Uma demanda tem 0..N. | `processos` (natureza = extrajudicial) | Processos |
| **Parte / Interessado** | Quem participa de uma demanda sem ser o cliente: parte contrária, cônjuge, herdeiros, testemunhas. Aponta para uma pessoa já cadastrada (ou cadastra uma na hora), sem duplicar fichas. | `partes` (`contato_id`) | Ficha › Demandas |
| **Movimentação** | Andamento registrado num processo/procedimento. | `movimentacoes` | Ficha › Demandas |
| **Tarefa** | Algo a fazer (com data de execução). Existe um só lugar para tarefas; a Agenda tem apenas prazos, audiências, consultas e reuniões. | `tarefas_internas` | Tarefas |
| **Prazo / Compromisso** | Obrigação ou evento com data: prazo processual, audiência, consulta, reunião. | `compromissos` | Prazos, Agenda |
| **Documento** | Pedido ao cliente (pendente → recebido → conferido) ou peça produzida pelo escritório (rascunho → final), por demanda, opcionalmente ligado a um processo/procedimento e a uma parte. Guarda só a referência do arquivo (provedor + link), pronta para o Drive. | `documentos` | Documentos, Ficha |
| **Interação / Histórico** | O que aconteceu, por cliente e, quando aplicável, por demanda. | `atividades`, `mensagens_whatsapp`, `auditoria` | Ficha › Histórico |
| **Financeiro** | Honorário (contratação) por demanda, parcelas e recebimentos. | `honorarios`, `lancamentos` | Financeiro |

Hierarquia: **Pessoa → Cliente → Demanda → Processo/Procedimento → Movimentações**, com Tarefas, Prazos, Documentos, Honorários e Histórico pendurados na demanda (ou no cliente, quando não pertencem a nenhuma).

## Onde cada informação mora (formulário dinâmico)
- **Cliente / Consulta**: `contato_respostas` (formulários de contexto cliente ou consulta).
- **Demanda**: `caso_respostas` (formulários de contexto demanda, opcionalmente só para certos serviços/procedimentos).
- Construtor visual em `/formularios` (ver "Construtor de formulários" abaixo).
- "Diagnóstico" não existe mais. **Dados coletados** (formulário) ficam em perguntas; a **análise jurídica do escritório** (análise, riscos, decisão) tem campos próprios na demanda (`casos.analise/riscos/decisao`).
- **Comercial por demanda:** cada demanda tem a sua situação comercial (sem proposta → proposta enviada → contratada), derivada dos honorários dela. Cliente antigo não volta ao funil: abre a demanda e registra a proposta dela.

## Regras de ciclo de vida
- Encerrar a última demanda de um cliente ativo → cliente "Concluído" (segue cadastrado).
- Abrir/reabrir demanda de cliente concluído → volta a "Ativo".
- O tipo (atuação) da demanda acompanha os processos: com judicial = judicial; só extrajudicial = extrajudicial.
- Apagar demanda leva processos, partes e movimentações; apagar processo mantém os prazos na demanda.

## Responsabilidades dos módulos
- **Dashboard**: panorama e o que exige atenção (máx. 5 itens, ação rápida); detalhe sempre no módulo.
- **Hoje**: trabalho executável do dia. **Tarefas / Prazos / Agenda**: gestão completa de cada um.
- **Notificações**: avisos que levam ao registro (um por assunto; urgente em destaque).
- **Pesquisa global** (lupa): cliente, demanda, processo, parte, documento, tarefa → abre a ficha. Filtros de lista ficam em cada módulo.

## Nomes físicos e legado (leia antes de mexer no banco)
"Caso" **não é conceito de negócio**. Por compatibilidade e para não perder dados, o banco mantém nomes antigos; a interface, os tipos (`Demanda`) e a API (`/api/demandas`) só usam "Demanda".

| Nome físico | O que é de fato | Situação |
|---|---|---|
| tabela `casos` | **Demandas / Serviços** (comentário na tabela) | ativa; renomear exige migração de todas as FKs — adiado de propósito |
| colunas `caso_id` (processos, partes, documentos, honorarios, lancamentos, atividades, tarefas_internas, compromissos, caso_respostas) | FK para a demanda | ativas |
| `casos.numero_processo/orgao/comarca/uf/fase_processual/valor_causa/link_tribunal/parte_contraria` | dados de processo que antes ficavam na demanda; hoje moram em `processos`/`partes` | **somente leitura**: o trigger `trg_campos_obsoletos` bloqueia novos valores; dados antigos preservados |
| tabela `diagnosticos` e etapa `diagnostico` | legado; a etapa aparece na UI como "Consulta realizada". Não há módulo Diagnóstico | mantidas por compatibilidade |
| tabelas `eva_*` | legado da antiga assistente; sem uso na UI | avaliar remoção com o escritório |
| "Buscar contatos" | não é módulo: é a pesquisa global e os filtros de cada lista | — |

## Integridade garantida pelo banco (triggers)
- `trg_demanda_da_pessoa`: em processos, documentos, honorários, tarefas, compromissos, atividades e lançamentos, a demanda (`caso_id`) tem de pertencer à **mesma pessoa** (`contato_id`); se `contato_id` vier vazio, herda da demanda.
- `trg_vinculos_da_demanda`: processo e parte ligados a um documento/compromisso têm de ser da **mesma demanda**.
- Testes executáveis: `supabase/tests/fase1_modelo_conceitual.sql` (7 cenários do modelo + triggers; roda em transação com rollback).

## Ciclo comercial (Fase 2)
**Pessoa → Lead → Consulta → Demanda → Proposta → Contratação → Cliente ativo → Concluído → (nova demanda)** — sempre a mesma linha em `contatos`; só a etapa muda.

| Situação | Como é representada |
|---|---|
| Pessoa cadastrada | etapa `relacionado` (parte/interessado; fora do funil) |
| Lead | etapas `novo`, `qualificacao`, `agendado` (consulta marcada), `diagnostico` (= "Consulta realizada"), `proposta` |
| Consulta | compromisso na agenda + honorário tipo "Consulta" (não é proposta e não faz a pessoa virar cliente) |
| Proposta / contratação | **honorário da demanda** (`honorarios.caso_id`): Proposta → Contratado → Pago |
| Cliente ativo | etapa `ativo` (com demanda em andamento) |
| Cliente sem demanda ativa | etapa `concluido` (todas as demandas encerradas; segue cadastrado) |
| Não contratou | etapa `perdido`: propostas abertas → Cancelado, demandas abertas → encerradas (resultado "desistência"); nada é apagado e a pessoa pode contratar depois na mesma ficha |

Regras (implementadas em `server/utils/ciclo.ts`, usadas por andamento, edição do contato e honorários; trava final no banco em `trg_ciclo_cliente`):
- Cliente (`ativo`/`concluido`) **não volta ao funil** nem vira "não contratou". Novo serviço = nova demanda, que tem a sua própria proposta/contrato; a etapa do cliente não muda por causa da proposta.
- Toda proposta/contrato é de **uma demanda**: usa a única demanda aberta; sem nenhuma, abre a demanda; com várias, exige escolher.
- Contratação registrada (pelo andamento ou pela tela de Honorários) promove lead/"não contratou" a cliente ativo; proposta registrada leva lead antigo a "Proposta enviada".
- Só quem contratou pode ser "Concluído", e só sem demanda em andamento (acontece sozinho ao encerrar a última). Reativar um concluído = abrir nova demanda.
- Testes: `tests/fase2/rodar.sh` (cenários A–D sobre as regras) e `supabase/tests/fase2_ciclo_comercial.sql` (trava no banco).

## Construtor de formulários (Fase 3)
Fluxo: **criar formulário → adicionar perguntas → configurar → organizar → lógica → visualizar → salvar → usar**. Evolui o que já existia (banco de perguntas + formulários + itens); nada foi recriado.

| Camada | O que é | Onde |
|---|---|---|
| Formulário | título, descrição, **contexto** (cliente / consulta / demanda + serviços), ativo | `formularios` |
| Seção | agrupamento e "etapa" do preenchimento; pode ter condição | `formulario_secoes` |
| Item | posição da pergunta no formulário, obrigatoriedade e **condição** (`mostrar_se`) | `formulario_itens` |
| Pergunta | texto, tipo, opções, ajuda; **reaproveitável** entre formulários (resposta única) | `formulario_perguntas` (+ `formulario_pergunta_versoes`) |
| Resposta atual | uma por pergunta, no cliente ou na demanda | `contato_respostas` / `caso_respostas` |
| Resposta enviada | snapshot do envio (texto da pergunta, seção, valor) | `formulario_envio_respostas` |

- **Tipos**: resposta curta, texto longo, número, data, e-mail, telefone, sim/não, seleção única, lista suspensa, múltipla seleção e checklist interno (acompanhamento; não é perguntado ao cliente). Definidos em `shared/data/formulario.ts`.
- **Lógica condicional**: `{ juntar: e|ou, regras: [{ pergunta_id, operador, valor }] }` no item ou na seção. Operadores por tipo (sim/não e escolha: é igual/diferente; múltipla: selecionou/não selecionou; número: igual, diferente, maior, menor; texto: contém/não contém/igual; todos: foi/não foi respondida). Só depende de pergunta **anterior**; resposta de pergunta escondida não conta (cascata). O mesmo motor roda na prévia, na página pública, na ficha e no servidor (`shared/data/formulario.ts`).
- **Ficha ≠ formulário**: o formulário define o que se pergunta; a ficha só **lê** `contato_respostas`/`caso_respostas` e organiza pelas seções do formulário. Não há cópia de dados.
- **Contexto**: a ficha do cliente mostra formulários de contexto cliente/consulta; a ficha de cada demanda mostra só os de contexto demanda que valem para o serviço dela. O banco impede pergunta de demanda em formulário de cliente (e vice-versa).
- **Histórico**: pergunta removida do formulário só é excluída se nunca foi respondida nem é usada noutro formulário; senão é **arquivada** e a resposta continua na ficha em "Fora do formulário". Trocar o **tipo** de pergunta já respondida cria uma pergunta nova e preserva a antiga. Cada edição de texto/opções guarda a versão anterior (`trg_versao_pergunta`). Formulário respondido não muda de contexto cliente↔demanda.
- Testes: `tests/formularios/` (núcleo, interface) e `supabase/tests/fase3_construtor_formularios.sql`.

## Demanda / Serviço e análise profissional (Fase 3)
A demanda é a unidade central: **tudo que é do serviço fica nela** e não aparece em outra demanda do mesmo cliente.

| Contexto da demanda | Onde mora |
|---|---|
| Tipo de serviço | `casos.procedimento` ("servico/variante", ex.: `pacto-antenupcial/padrao`, `divorcio/judicial`) + `area` |
| Atuação | `casos.tipo`: **consultiva** (orientação/parecer), **documental** (elaboração de documentos: pacto, testamento, contratos), **extrajudicial** ou **judicial** |
| Status / resultado | `casos.status` (ativo, suspenso, encerrado) e `resultado` |
| Responsável | `casos.responsavel_id` (escolhido ao abrir/editar; mudança vai ao histórico) |
| Dados coletados | perguntas dos formulários de contexto **demanda** que valem para o serviço (`caso_respostas`) |
| Análise profissional | campos próprios: fatos, fundamentos (`analise`), estratégia, riscos, conclusão, decisão + **anotações datadas** (`demanda_notas`) |
| Documentos, tarefas, prazos, honorários, histórico | `caso_id` em cada tabela (o banco impede misturar demandas/pessoas) |
| Processo / procedimento | `processos` (0..N por demanda) |

- **Dados coletados ≠ análise profissional.** As perguntas coletam; a análise é o que o escritório conclui e **não depende do construtor de formulários**. O antigo "Análise da consulta" (perguntas) passou a se chamar "Dados da consulta".
- **Evolução**: uma demanda consultiva/documental evolui ao registrar o processo ou procedimento (extrajudicial → judicial): a atuação acompanha e a mudança entra no histórico da demanda.
- **Formulários por serviço**: um formulário de demanda pode valer para todas as demandas, para um serviço inteiro (`divorcio/*`) ou para uma forma específica (`divorcio/judicial`). Demanda sem serviço definido só recebe o que vale para todas. Se o serviço da demanda muda, respostas já dadas continuam visíveis em "Fora do formulário".
- Testes: `tests/fase3/` (isolamento por serviço, análise, evolução; interface da análise) e `supabase/tests/fase3_demandas.sql`.

## Judicial × Extrajudicial (Fase 4)
**Demanda é o serviço; processo/procedimento é a execução formal.** Os dois compartilham a tabela `processos` (infraestrutura: partes, documentos, prazos, tarefas, histórico, movimentações), mas têm **fluxos próprios** — e a demanda **nunca é duplicada** quando evolui (consultiva → extrajudicial → judicial): o processo/procedimento é registrado na mesma demanda, a atuação acompanha e o histórico registra.

| | Judicial | Extrajudicial |
|---|---|---|
| Identificação | número **CNJ** (validado; pode faltar até a distribuição), **tribunal**, **vara/juízo**, comarca/UF, valor da causa, link no tribunal | **tipo de procedimento** (obrigatório), **cartório/serventia**, protocolo/livro-folha, cidade/UF, valor do ato, link de acompanhamento |
| Andamento | **fase processual** + movimentações (decisões, intimações, audiências) | **etapas formais** (protocolo, exigências, ITCMD, lavratura, registro…) — a "fase" é a etapa em andamento |
| Travas | diligências/pendências | **pendências / exigências** (aguardando cliente, cartório, escritório ou terceiro; com prazo) |
| Prazos | prazo processual: intimação + dias úteis (calculadora) | data limite direta (validade de certidão, exigência do cartório) |
| Partes | papéis judiciais (autor/réu, inventariante, herdeiro…) + **polo** | papéis do ato (outorgante, cônjuge, herdeiro, procurador, escrevente…) |
| Conclusão | desfecho: sentença, acordo, partilha homologada, extinção, desistência, arquivamento | desfecho: escritura lavrada, lavrada e registrada, registro concluído, desistência, cancelado, **convertido em processo judicial** |
| Regra de conclusão | desfecho obrigatório | sucesso exige todas as etapas cumpridas/dispensadas e nenhuma pendência aberta |

- O banco impede misturar campos: extrajudicial não tem tribunal; judicial não tem tipo de procedimento (`processos_campos_por_natureza`). A natureza não muda depois de criada.
- Tarefas, prazos, documentos e histórico podem apontar para o processo/procedimento; o banco garante que ele é da mesma demanda (e herda demanda e pessoa quando só o processo é informado).
- Inventário e divórcio têm roteiro (POP) próprio para cada forma: `inventario/extrajudicial`, `inventario/judicial`, `divorcio/extrajudicial`, `divorcio/judicial`. Ao evoluir de uma para outra, o roteiro do serviço acompanha (registrado no histórico).
- Testes: `tests/fase4/` (fluxos e interface) e `supabase/tests/fase4_judicial_extrajudicial.sql`.

## Intimações (registro manual)
Tela **Intimações** (`/intimacoes`, menu Trabalho): o escritório registra cada intimação/publicação de um **processo judicial**. Não há integração com tribunais; o valor está em transformar o registro em ação:
- **Prazo** na agenda: dias úteis a partir da publicação (calculadora existente), ligado ao processo, à demanda e ao cliente.
- **Tarefa** de trabalho (2 dias antes do vencimento por padrão, editável; nunca no passado). Sem prazo informado, nasce a tarefa "analisar intimação e definir o prazo" para hoje: intimação nunca fica sem próxima ação.
- **Andamento** lançado no processo (tipo "Publicação / intimação") e histórico da demanda.
- Fila **A tratar / Tratadas**, com os sem prazo em destaque no topo; "tratada" dá baixa no prazo e na tarefa; reabrir desfaz; excluir remove o prazo e a tarefa pendentes gerados.
- Só processo judicial (o banco recusa intimação em procedimento extrajudicial, que usa "Exigências / pendências"). Tabela `intimacoes`; regras em `server/utils/intimacoes.ts`. Testes: `tests/intimacoes/` e `supabase/tests/intimacoes.sql`.
- Limite conhecido: a calculadora não conhece feriados estaduais/municipais nem suspensões do tribunal; a tela avisa para conferir o vencimento no tribunal.

## Fase 5 — Partes, interessados e pessoas relacionadas

**Regra:** uma pessoa = um registro em `contatos`. Parte/interessado é só um *papel* dessa pessoa numa demanda (`partes.contato_id`), nunca uma segunda ficha.

- **Escolher ou cadastrar (`SeletorPessoa` + `POST /api/partes`)**: busca única (`GET /api/pessoas/buscar`: nome, e-mail, telefone). `pessoa_id` vincula a existente; `nova_pessoa` passa por `resolverPessoa` (`server/utils/partes.ts`): (1) telefone já cadastrado → reaproveita; (2) nome idêntico (sem acento/caixa) → `409` com `data.candidatas` (usar esta / é outra pessoa → `confirmar_nova`); (3) com telefone cadastra como `relacionado` (fora do funil); (4) sem telefone fica parte "sem cadastro", vinculável depois (`POST /api/partes/:id/vincular`).
- **Papel** é texto livre com sugestões por contexto (`papeisSugeridos`), então "outro" sempre é possível. **Polo** só em processo judicial. `partes.processo_id` (opcional) liga a parte a um processo/procedimento da mesma demanda (trigger `checar_parte_processo`).
- **Banco:** índice único `partes_caso_pessoa_uq (caso_id, contato_id)` impede a mesma pessoa duas vezes na demanda; apagar pessoa/processo preserva a parte (FK `set null`).
- **Edição/remoção:** `PUT /api/partes/:id` (papel, polo, processo, observação); `DELETE` só desvincula — a pessoa continua cadastrada.
- **Histórico:** ações gravam em `atividades` na demanda do cliente e na ficha da própria pessoa; a ficha mostra "Também aparece como parte em…" (`participacoes`).
- Testes: `tests/fase5/rodar.sh` (regras) e `supabase/tests/fase5_partes_pessoas.sql` (banco).

## Secretária (painel pessoal, tela `/secretaria`)

Página própria do CRM para organizar o dia. Só o **Início** está pronto; as demais abas (Intimações, E-mail, Leads, Iniciais, Notícias, Conteúdo) mostram "em breve" (Intimações e Leads apontam para as telas que já existem).

- **Dados:** não cria agenda paralela. Usa `compromissos` (prazo, audiência, consulta, reunião), `tarefas_internas`, `intimacoes` e `contatos` já existentes, mais três tabelas novas (`supabase/migrations/20260930100000_secretaria.sql`): `lembretes_rapidos` (por usuária), `suspensoes_expediente` (da equipe) e `secretaria_config` (por usuária: tribunal, pontos facultativos, cidade, atalhos).
- **API:** `GET /api/secretaria/inicio` (tudo do Início), `POST /api/secretaria/criar` (prazo, audiência, consulta, reunião, tarefa, lembrete), `…/lembretes` (criar, concluir, excluir, pôr na agenda), `…/suspensoes`, `PUT …/config`. Lógica em `server/utils/secretaria.ts`.
- **Prazo em dias úteis:** `shared/utils/calendarioForense.ts` (feriados nacionais, Sexta-feira Santa, recesso 20/12–20/01, dias sem expediente do TJBA, TRT5 e Justiça Federal, feriados de Salvador e suspensões anotadas). O vencimento é sempre calculado no servidor. Pontos facultativos **não** são descontados por padrão; a tela mostra a data alternativa. Cada data traz a fonte (lei, regra geral, resumo oficial a conferir). Os decretos dos tribunais não puderam ser abertos na montagem: ver `NAO_CONFIRMADO` no mesmo arquivo. O cálculo antigo (`calcularPrazo`, só nacional) continua valendo nas demais telas.
- **Campo "O que você precisa?":** `shared/utils/secretariaTexto.ts` entende português (prazo de N dias, hoje/amanhã/dia da semana/dd/mm, 10h30, audiência, consulta, reunião, tarefa, lembrete) **sem IA e sem rede**. É sempre uma proposta que a pessoa confere antes de criar. "Resumo do dia" é montado com os dados da tela.
- **Não feito:** sincronização com o Google Agenda (exige credenciais OAuth que o CRM não tem) e interpretação por IA (exige chave de API no servidor).
- **Testes:** `tests/secretaria/rodar.sh` (calendário, texto livre, regras do servidor), `tests/secretaria/ui.mjs` (navegador, APIs simuladas), `supabase/tests/secretaria.sql` (restrições das tabelas).
