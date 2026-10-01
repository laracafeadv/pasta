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

Página própria do CRM para organizar o dia, **independente das demais telas**: tem agenda e prazos próprios e não lê nem grava em Agenda, Prazos, Tarefas, Intimações ou Leads do CRM. Só o **Início** está pronto; as outras abas (Intimações, E-mail, Leads, Iniciais, Notícias, Conteúdo) mostram "em breve".

- **Dados** (`supabase/migrations/20260930100000_secretaria.sql` e `…110000_secretaria_agenda_propria.sql`): `secretaria_itens` (agenda própria do escritório: prazo, audiência, consulta, compromisso e tarefa; `user_id` = quem criou, base do "só as minhas"), `lembretes_rapidos` (por usuária), `suspensoes_expediente` (da equipe) e `secretaria_config` (por usuária: tribunal, pontos facultativos, cidade, atalhos).
- **API:** `GET /api/secretaria/inicio`, `POST /api/secretaria/criar` (prazo, audiência, consulta, compromisso, tarefa, lembrete), `PATCH|DELETE /api/secretaria/itens/:id` (concluir, excluir), `…/lembretes` (criar, concluir, excluir, pôr na agenda), `…/suspensoes`, `PUT …/config`. Lógica em `server/utils/secretaria.ts`.
- **Prazo em dias úteis:** `shared/utils/calendarioForense.ts` (feriados nacionais, Sexta-feira Santa, recesso 20/12–20/01, dias sem expediente do TJBA, TRT5 e Justiça Federal, feriados de Salvador e suspensões anotadas). O vencimento é sempre calculado no servidor. Pontos facultativos **não** são descontados por padrão; a tela mostra a data alternativa. Cada data traz a fonte (lei, regra geral, resumo oficial a conferir). Os decretos dos tribunais não puderam ser abertos na montagem: ver `NAO_CONFIRMADO` no mesmo arquivo. Prazo vencido e sem baixa continua na agenda (em vermelho) até ser concluído.
- **Campo "O que você precisa?":** `shared/utils/secretariaTexto.ts` entende português (prazo de N dias, hoje/amanhã/dia da semana/dd/mm, 10h30, audiência, consulta, compromisso, tarefa, lembrete) **sem IA e sem rede**. É sempre uma proposta que a pessoa confere antes de criar. "Resumo do dia" é montado com os dados da tela.
- **Não feito:** interpretação por IA (exige chave de API no servidor).
- **Testes:** `tests/secretaria/rodar.sh` (calendário, texto livre, regras do servidor), `tests/secretaria/ui.mjs` (navegador, APIs simuladas), `supabase/tests/secretaria.sql` (restrições das tabelas).

### Secretária — etapa 2: Intimações e E-mail (Gmail + Google Agenda)

O CRM não usa os conectores do Claude (só existem no artefato): fala **direto com o Google**, com o login OAuth da própria usuária.

- **Ligar:** cria-se um ID de cliente OAuth no Google Cloud (APIs Gmail e Calendar ativas, URI de retorno `<site>/api/google/callback`) e definem-se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` na Vercel. Sem isso, as abas mostram o passo a passo e nada é chamado. Escopos pedidos: `gmail.readonly` (nunca envia nem apaga) e `calendar.events`.
- **Segurança:** os tokens ficam **cifrados** (AES-256-GCM) em `google_conexoes`, com RLS e **sem políticas** (só a chave de serviço do servidor lê). O `state` do OAuth é assinado (HMAC), amarrado à usuária e expira em 10 minutos. `google_avisos_cache` (resultado já lido de cada e-mail) segue a mesma regra. `avisos_prazos` (marca "Prazo lançado") é da própria usuária.
- **Rotas:** `GET /api/google/status|conectar|callback`, `POST /api/google/desconectar`, `GET /api/secretaria/intimacoes` (avisos de @jus.br dos últimos 14 dias, sem alertas de login/senha), `GET /api/secretaria/email?sub=principal|naolidos|tudo` (7, 14 e 3 dias), `POST /api/secretaria/intimacoes/:thread/prazo`.
- **Leitura eficiente:** `threads.list` já traz o `historyId`; o corpo de um e-mail só é relido quando ele é novo ou mudou (máx. 40 por atualização). "Não lida" vem de uma segunda busca `is:unread`. A tela atualiza sozinha a cada 5 minutos com a página visível.
- **Lançar prazo:** dias, úteis ou corridos, data da ciência e calendário do tribunal; o vencimento aparece antes de confirmar e é **sempre recalculado no servidor** (`contarPrazo`, com suspensões anotadas). Ao confirmar, o servidor cria o **evento no Google Agenda primeiro** (dia todo, vermelho, avisos 3 dias e 1 dia antes): se falhar, nada é gravado. Depois grava o prazo na agenda da Secretária, o lembrete e a marca "Prazo lançado · vence dd/mm". Se o evento for criado e a gravação falhar, a mensagem manda não lançar de novo.
- **Hoje e selo:** as intimações sem prazo lançado entram como cartão na faixa Hoje e no número da aba Intimações.
- **Limites:** não foi testado contra o Google real (sem credenciais na montagem); o eproc e as nomeações seguem o formato do assunto/prévia quando o corpo não traz a tabela de movimentos do PJe Push. O Google pode exigir verificação do app para uso fora do modo "Teste" (usuária de teste é suficiente para uso próprio).
- **Testes:** `tests/secretaria/google.test.ts` (cifra, state, renovação de token, leitura e cache, lançar prazo, chamadas à API do Google), `tests/secretaria/ui-google.mjs` (navegador), `supabase/tests/secretaria_google.sql`.

### Secretária — etapa 3: aba Leads (contatos novos)

Quadro próprio da Secretária (tabela `secretaria_leads`), **independente** das telas de Clientes/Leads do CRM.

- **Etapas:** Novo contato → Ag. consulta → Proposta enviada → Fechou → Não fechou (cards arrastáveis; em telas de toque há "Mover para…"). "Sumiu" **não é etapa**: é a situação da conversa (aguardando o cliente há mais de 3 dias). "Não fechou" exige motivo (também no banco).
- **Regras (`shared/utils/leadsSecretaria.ts`, puras e testadas):** semana começa na segunda (horário de Brasília); conversão = fechados ÷ leads do período (pela data do contato); o número da aba conta leads em etapas ativas aguardando a resposta da Dra. Lara.
- **Rotas:** `GET|POST /api/secretaria/leads`, `PUT|DELETE /leads/[id]`, `POST /leads/[id]/mover|conversa|consulta`, `GET /leads/consultas`, `POST /leads/importar`.
- **Consulta na agenda:** na coluna "Ag. consulta" procura no Google Agenda um evento com o nome do lead (verde = marcada, amarelo = já passou, vermelho = não tem). "Marcar na agenda" cria o evento (lembretes 1 dia e 1 hora antes; Meet se on-line). Exige a conexão Google da etapa 2; sem ela a aba funciona, sem as cores.
- **Importar conversa:** .txt ou .zip exportado do WhatsApp (o .zip é lido no navegador com `jszip`). Com `ANTHROPIC_API_KEY` (e opcional `ANTHROPIC_MODEL`) a IA preenche a ficha; sem ela, o servidor extrai só o que o arquivo mostra (nome, telefone, datas) e avisa. Nada é salvo antes de a usuária conferir.
- **Limites:** não testado contra o Google nem a API da Anthropic reais, nem com exportações reais do WhatsApp em .zip; só com APIs simuladas.
- **Testes:** `tests/secretaria/leads*.test.ts`, `tests/secretaria/ui-leads.mjs` (Playwright, APIs simuladas), `supabase/tests/secretaria_leads.sql`.

### Secretária — etapa 4: aba Iniciais (petições iniciais)

Quadro próprio (tabela `secretaria_iniciais`), independente de Demandas/Processos do CRM.

- **Etapas:** Aguardando documentos → A produzir → Em redação → Em revisão → Pronta para protocolar → Protocolada. Cards arrastáveis, botão "Avançar" (uma etapa por vez) e "Mover para…".
- **Protocolar:** exige a data (padrão: hoje); o número do processo é opcional na hora (pode chegar depois) e, se digitado, o dígito verificador do CNJ é conferido (módulo 97). Voltar de Protocolada não apaga data nem número.
- **Pendências:** chegar a "Pronta" ou "Protocolada" com documentos pendentes pede confirmação ("Avançar mesmo assim"); o servidor também recusa sem `confirmar_pendencias`.
- **Datas:** a meta de protocolo nunca passa do prazo fatal (prescrição/decadência), validado na tela, no servidor e no banco. O alerta de cada card vale a data mais próxima entre as duas; vencida = atrasada; até 7 dias = vencendo.
- **Ligação com o painel:** iniciais atrasadas ou com a data mais próxima em até 2 dias entram na faixa "Hoje" (cartão "Iniciais atrasadas ou a vencer"), no número da aba e no "Resumo do dia". O campo "O que você precisa?" entende textos que citam "inicial": consultar ("quais iniciais estão atrasadas?"), "nova inicial de divórcio para Ana Lima, meta dia 20/10", "inicial do João: falta PPP", "recebi a CTPS da inicial do João", "avançar inicial da Maria" — sempre como proposta a confirmar; nome ambíguo pede escolha.
- **Regras:** `shared/utils/iniciaisSecretaria.ts` (puras, testadas). Rotas: `GET|POST /api/secretaria/iniciais`, `PUT|DELETE /iniciais/[id]`, `POST /iniciais/[id]/mover`.
- **Testes:** `tests/secretaria/iniciais*.test.ts`, `tests/secretaria/ui-iniciais.mjs` (Playwright, APIs simuladas), `supabase/tests/secretaria_iniciais.sql`.
- **Correção junto:** o "hoje" do Início passou a usar o horário de Brasília (antes, depois das 21h o servidor em UTC já estava no dia seguinte e a tela acusava divergência).

### Secretária — etapa 5: Notícias e Conteúdo (versão do artefato)

Nesta etapa só o **artefato** foi feito; as duas abas seguem "em breve" no CRM. Motivo: dependem de uma tarefa agendada que grava no banco do artefato e do conector Gmail do Claude, que o CRM não tem (o CRM precisaria de coletor próprio com `ANTHROPIC_API_KEY`).

- **Notícias:** tarefa agendada (rotina) às 6h50 de Brasília pesquisa 6 a 8 notícias (Família, Sucessões, tribunais superiores, TRT5, TJBA, INSS, OAB/BA), confere a data na própria página e grava em `data/users/<id>/painel/noticias` (titulo, resumo, fonte, link, area, publicadaEm, dia, coletadoEm); apaga as com mais de 10 dias. A aba mostra só a janela de 10 dias, agrupada por dia, com filtro por área, links https externos (`rel=noopener`) e aviso se não há notícias de hoje.
- **Conteúdo:** links editáveis (Instagram e páginas), assunto do e-mail configurável, ideias do e-mail mais recente (a IA só organiza o texto em título/formato/gancho/roteiro, sem inventar; extração guardada em `config/conteudo_ideias` por mensagem) e revisão do Provimento 205/2021 (`shared/utils/conteudoSecretaria.ts`): alerta valores, gratuidade/desconto, promessa de resultado, chamada para contratar e sensacionalismo. É alerta, não bloqueio; a decisão é da advogada.
- **Testes:** `tests/secretaria/conteudo.test.ts` (regras) e, no artefato, teste de navegador com Gmail e Claude simulados.

### CRM em HTML (artefato independente)

Versão em página única do CRM, publicada como artefato próprio (`CRM Lara Café`), com dados em `data/users/<id>/crm/<coleção>` (pessoas, demandas, processos, partes, movimentações, tarefas, compromissos, documentos, honorários, lançamentos, atividades). **Não lê nem escreve no Supabase**: é outro sistema de dados; nada do CRM do site foi migrado. A cópia de segurança (`.json`) e a importação ficam em Ajustes.

- Módulos: Painel (atenção, Hoje, próximos 7 dias, financeiro, funil), Pessoas (funil arrastável + lista + ficha), Demandas (resumo/análise/procedimento, processos e partes, documentos, tarefas e prazos, financeiro), Processos (movimentações), Tarefas, Agenda (calculadora de prazo em dias úteis com calendário forense), Documentos, Financeiro (parcelas e baixa), Relatórios, Ajustes, pesquisa global.
- Regras (`shared/utils/crmHtml.ts`, testadas): demanda aberta leva a pessoa a "Cliente ativo"; encerrar a última leva a "Concluído"; a demanda manda no cliente dos itens ligados a ela; apagar demanda leva processos, partes, movimentações e documentos, solta tarefas/compromissos e **bloqueia** se houver honorário ou lançamento; CNJ validado; parcelamento com centavos exatos.
- **Fora desta versão** (dependem do site/servidor): Ana no WhatsApp, formulários públicos, Drive/Gmail do CRM, peças em Word, multiusuário/login, histórico de auditoria do servidor.
- Testes: `tests/secretaria/crmhtml.test.ts` (regras) e teste de navegador do artefato (fluxo completo, dados congelados do banco, backup/importação).
