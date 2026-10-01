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
