# Arquitetura do software de gestão do escritório

## Conceitos (o que cada um significa)

| Conceito | Definição | Tabela | Módulo |
|---|---|---|---|
| **Pessoa / Contato** | Qualquer pessoa conhecida pelo escritório, cadastrada uma única vez. Estados (etapa): novo → em qualificação → consulta agendada → consulta realizada → proposta enviada → cliente ativo → concluído (ou não contratou). "Pessoa cadastrada" (`relacionado`) é quem só aparece como parte/interessado: não é lead nem cliente e não entra em funil nem em Hoje. | `contatos` | Leads, Clientes, Mensagens |
| **Lead** | Pessoa ainda em atendimento comercial (etapas novo → proposta). Não é outra entidade: é a etapa do contato. | `contatos.etapa` | Leads |
| **Cliente** | Pessoa que contratou (etapa ativo / concluído). Continua cadastrada depois de tudo encerrado. | `contatos.etapa` | Clientes |
| **Demanda / Serviço** | O que o cliente contratou: consultivo, documental, extrajudicial ou judicial. Um cliente tem várias ao longo do tempo. Contém procedimento (checklist), informações próprias, documentos, prazos, tarefas, honorário e histórico. | `casos` (nome interno; "Caso" não existe mais na interface) | Demandas |
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
- **Cliente**: `contato_respostas` (perguntas de escopo "cliente").
- **Demanda**: `caso_respostas` (perguntas de escopo "demanda", opcionalmente por procedimento).
- Perguntas condicionais (`mostrar_se`), seções, ordem, ativação e exclusão segura no construtor.
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
