# Arquitetura do software de gestão do escritório

## Conceitos (o que cada um significa)

| Conceito | Definição | Tabela | Módulo |
|---|---|---|---|
| **Pessoa / Contato** | Qualquer pessoa que já falou com o escritório. Cadastrada uma única vez. | `contatos` | Leads, Clientes, Mensagens |
| **Lead** | Pessoa ainda em atendimento comercial (etapas novo → proposta). Não é outra entidade: é a etapa do contato. | `contatos.etapa` | Leads |
| **Cliente** | Pessoa que contratou (etapa ativo / concluído). Continua cadastrada depois de tudo encerrado. | `contatos.etapa` | Clientes |
| **Demanda / Serviço** | O que o cliente contratou: consultivo, documental, extrajudicial ou judicial. Um cliente tem várias ao longo do tempo. Contém procedimento (checklist), informações próprias, documentos, prazos, tarefas, honorário e histórico. | `casos` (nome interno; "Caso" não existe mais na interface) | Demandas |
| **Processo** (judicial) | Execução formal em juízo: tribunal, vara, número CNJ, fase, valor, movimentações. Uma demanda tem 0..N. | `processos` (natureza = judicial) | Processos |
| **Procedimento** (extrajudicial) | Execução formal fora do Judiciário: cartório/serventia, protocolo, etapas, atos. Uma demanda tem 0..N. | `processos` (natureza = extrajudicial) | Processos |
| **Parte / Interessado** | Quem participa de uma demanda sem ser o cliente: parte contrária, cônjuge, herdeiros, testemunhas. | `partes` | Ficha › Demandas |
| **Movimentação** | Andamento registrado num processo/procedimento. | `movimentacoes` | Ficha › Demandas |
| **Tarefa** | Algo a fazer (com data de execução). | `tarefas_internas` | Tarefas |
| **Prazo / Compromisso** | Obrigação ou evento com data: prazo processual, audiência, consulta, reunião. | `compromissos` | Prazos, Agenda |
| **Documento** | Item pedido ao cliente, por demanda (recebido / pendente). | `documentos` | Documentos, Ficha |
| **Interação / Histórico** | O que aconteceu, por cliente e, quando aplicável, por demanda. | `atividades`, `mensagens_whatsapp`, `auditoria` | Ficha › Histórico |
| **Financeiro** | Honorário (contratação) por demanda, parcelas e recebimentos. | `honorarios`, `lancamentos` | Financeiro |

Hierarquia: **Pessoa → Cliente → Demanda → Processo/Procedimento → Movimentações**, com Tarefas, Prazos, Documentos, Honorários e Histórico pendurados na demanda (ou no cliente, quando não pertencem a nenhuma).

## Onde cada informação mora (formulário dinâmico)
- **Cliente**: `contato_respostas` (perguntas de escopo "cliente").
- **Demanda**: `caso_respostas` (perguntas de escopo "demanda", opcionalmente por procedimento).
- Perguntas condicionais (`mostrar_se`), seções, ordem, ativação e exclusão segura no construtor.
- "Diagnóstico" não existe mais: virou a seção "Análise da consulta" (perguntas da demanda).

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
