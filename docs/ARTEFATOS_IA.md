# Workspace de criação com IA (Artefatos) — diagnóstico e arquitetura proposta

Status: **proposta para aprovação** (nada implementado). Base: leitura do código do repositório em 01/10/2026.

## O que torna os Artifacts do Claude possíveis (os conceitos, sem a aparência)

1. **O resultado é um objeto tipado, não texto.** O conteúdo mora num formato canônico (aqui: JSON validado), separado da conversa.
2. **O modelo não "escreve na tela": ele chama ferramentas** (tool use) com argumentos estruturados. Quem aplica é o sistema anfitrião.
3. **Editar é aplicar operações pequenas ao mesmo objeto** (adicionar pergunta, marcar obrigatória), não regenerar tudo. Isso preserva identidade, custa menos e dá diff.
4. **Cada tipo tem um renderizador** que transforma o conteúdo em tela viva (visualizar, testar, editar).
5. **Versões imutáveis**: cada mudança cria uma revisão; "voltar" é criar uma nova revisão a partir da antiga.
6. **O anfitrião é a autoridade**: valida, aplica permissões, decide o que vira efeito real (publicar, criar cliente).

Tudo isso se reproduz com o que o projeto já tem. O que **não** devemos copiar é "a IA gera código que roda dentro do sistema": com dados de clientes (LGPD) isso é o maior risco e só entra no fim, isolado.

---

## ETAPA 1 — Diagnóstico

### O que já existe
| Tema | Situação no código |
|---|---|
| Stack | Nuxt 4 / Vue 3 (`<script setup>`), Tailwind, Pinia, Nitro (rotas em `server/api`), Supabase (Postgres + RLS + Auth), `docx` (peças em Word), `jszip`, Vercel. |
| Autenticação e papéis | Supabase Auth; `profiles.role` = admin / equipe / user; `requireStaff` e `requireAdmin` (`server/utils/security.ts`); RLS por `is_staff()`. |
| Auditoria | `auditar()` grava ação + entidade + **só ids e nomes de campos** (LGPD) numa tabela imutável. |
| Formulários | Camadas prontas: `formularios` → `formulario_secoes` → `formulario_itens` (posição, obrigatória, condição) → `formulario_perguntas` (reaproveitável, com versões por pergunta). 11 tipos, lógica condicional, contexto cliente/consulta/demanda, serviços. |
| **Ponto mais valioso** | `salvarEstrutura(client, id, EstruturaEntrada)` salva o formulário inteiro de uma vez **sem perder respostas** (arquiva pergunta respondida, cria nova pergunta ao mudar o tipo). `limparEstrutura` valida tudo em português. Regras compartilhadas em `shared/data/formulario.ts`. |
| Editor visual | `ConstrutorFormulario.vue` (411 linhas: editar, visualizar, condições), `FormularioPreenchimento.vue`, `PerguntaCard.vue`. |
| Documentos | `documento_modelos`, `modelos_mensagem`; `/api/pecas/*` gera procuração e contrato em Word. |
| IA hoje | Só `server/utils/anthropic.ts` (uma chamada que devolve JSON, usada na importação de conversa do WhatsApp). `ANTHROPIC_API_KEY` ainda **não está configurada** no ambiente. Não há chat, streaming nem uso de ferramentas. |
| Componentes reutilizáveis | Modal, Tabs, DataTable, KpiCard, DonutChart, Button, Input, Select, Dropdown, Alert, Badge, Card. |
| Padrões que funcionam | Lógica pura em `shared/` testada com Node; rotas finas; migrações espelhadas em `supabase/migrations`; testes SQL com rollback. |

### O que falta
- Nenhuma noção de **objeto de trabalho** (rascunho) separado do objeto real. Hoje editar um formulário já altera o formulário em uso.
- **Versão do formulário inteiro** (só existe versão por pergunta).
- Camada de **ferramentas da IA** (registro, schemas, permissões, aprovação).
- **Conversa persistida**, streaming e limites de custo.
- Um **shell de workspace** (chat + área do artefato).

### Limitações a tratar desde já
- **LGPD**: enviar dados de clientes à API da Anthropic exige minimização (enviar só o necessário, nunca CPF/documentos), aviso no escritório e revisão do contrato de tratamento de dados.
- **Vercel**: respostas longas precisam de streaming (SSE) e `maxDuration` configurado.
- **Conteúdo jurídico gerado** (contratos, cláusulas) é minuta: sempre marcado "revisar" e passando pela checagem do Provimento 205/2021 quando for comunicação.
- **Injeção de prompt**: texto de cliente (respostas de formulário, WhatsApp) é dado, nunca instrução.

---

## ETAPA 2 — Arquitetura proposta

**Quatro camadas, cada uma trocável:**

```
Workspace (UI)  ─►  API de IA (orquestrador)  ─►  Registro de ferramentas  ─►  Domínio do CRM
chat + artefato      loop de tool use, SSE,        schemas, validação,          salvarEstrutura, tarefas,
                     limites, auditoria            permissão, aprovação         clientes (código existente)
                                  ▲
                         Registro de TIPOS de artefato
         (schema do conteúdo · operações · renderizador · adaptador de publicação)
```

### Decisões centrais (e por quê)

**D1. Artefato ≠ recurso real (rascunho e publicado são coisas separadas, ligadas 1:1).**
O artefato é o espaço de trabalho (rascunho + histórico). Quando "publicado", ele é **materializado no objeto real** (`formularios`) e fica ligado a ele (`recurso_tipo`, `recurso_id`). Editar depois cria nova versão do **mesmo** artefato e republica **no mesmo** formulário (usando `salvarEstrutura`, que já preserva respostas). Isso resolve seu requisito "modificar o mesmo objeto, não gerar uma versão desconectada" e protege formulários em uso de testes da IA.

**D2. Conteúdo declarativo (JSON validado), não código.**
Formulário, checklist, tabela, relatório, fluxo, automação e documento são **especificações** desenhadas por componentes nativos e confiáveis. "Página/interface" em HTML livre fica por último, em iframe isolado sem acesso aos dados.

**D3. A IA edita por operações, não reescrevendo.**
Cada tipo declara operações com schema (`add_question`, `set_required`…). Uma função pura `aplicar(conteudo, operação)` roda igual no servidor, no navegador (prévia otimista) e nos testes. Erros voltam ao modelo ("pergunta não existe") para ele se corrigir.

**D4. Três níveis de risco nas ferramentas.**
- **T0 leitura** (listar/consultar, com campos mínimos): executa direto.
- **T1 rascunho** (criar/alterar artefato): executa direto; é reversível pelas versões.
- **T2 efeito real** (publicar, criar cliente, criar tarefa, ativar automação, enviar mensagem): a IA só **propõe**; a tela mostra um cartão "Aprovar / Recusar"; só então o servidor executa. Isso também neutraliza injeção de prompt.

**D5. A IA nunca toca o banco.** Só chama ferramentas do registro; cada uma usa o cliente Supabase **do usuário** (RLS aplicada), valida com schema, passa por `requireStaff` e grava auditoria.

**D6. Editor humano e IA mexem no mesmo conteúdo.** Salvar à mão também cria versão (`origem: usuario`). Concorrência por número de versão base; operações pequenas quase nunca conflitam.

### Workspace: a divisão esquerda/direita é a melhor?
Sim para o computador, com duas adaptações ao seu CRM (solo, com formulários que já têm editor próprio):
1. **Um shell só, usado em dois lugares**: tela `/workspace` (biblioteca + conversa + artefato) **e** painel lateral "Pedir à IA" dentro de `/formularios/[id]`, ficha do cliente e da demanda (já abre com o contexto certo). Evita duas interfaces.
2. **No celular**, alternância "Conversa | Artefato" em vez de dois painéis.
Alternativa descartada: só um botão "Enviar para a IA" — não dá o ciclo ver → pedir ajuste → ver de novo.

---

## ETAPA 3 — Modelo de dados (Supabase)

```sql
-- O objeto de trabalho
ia_artefatos (
  id uuid pk, tipo text not null,            -- 'formulario' | 'checklist' | 'documento' | ... (validado pelo registro)
  titulo text not null,
  status text not null default 'rascunho',   -- rascunho | publicado | arquivado
  versao_atual int not null,                 -- número da versão mais recente
  versao_publicada int,                      -- qual versão está no ar (null = nunca publicado)
  recurso_tipo text, recurso_id text,        -- ligação 1:1 com o objeto real (ex.: 'formulario', '42')
  contato_id bigint, caso_id bigint, processo_id bigint,   -- contexto opcional (FKs)
  conversa_id uuid,
  criado_por uuid not null, atualizado_por uuid,
  criado_em, atualizado_em, excluido_em      -- exclusão lógica
)
-- Histórico IMUTÁVEL (trigger bloqueia update/delete)
ia_artefato_versoes (
  id uuid pk, artefato_id fk, numero int,    -- unique (artefato_id, numero)
  conteudo jsonb not null,                   -- estado completo naquela versão
  schema_versao int not null,                -- migra conteúdo antigo quando o tipo evoluir
  operacoes jsonb,                           -- o que mudou em relação à anterior
  resumo text,                               -- "Adicionou pergunta sobre regime de bens"
  origem text not null,                      -- ia | usuario | restauracao | importacao
  restaurada_de int,                         -- se veio de "voltar para a versão N"
  mensagem_id uuid, criado_por uuid, criado_em
)
-- Conversa e trilha do que a IA fez
ia_conversas (id, titulo, contato_id, caso_id, criado_por, criado_em)
ia_mensagens (id, conversa_id, papel, texto, artefato_id, versao_numero, tokens_in, tokens_out, criado_em)
ia_acoes (                                    -- toda chamada de ferramenta, para auditoria e aprovação
  id, conversa_id, mensagem_id, ferramenta, nivel,        -- T0|T1|T2
  argumentos jsonb, resultado jsonb,
  estado text,                                -- proposta | aplicada | recusada | erro
  decidido_por uuid, decidido_em, criado_em )
```
- **Quem criou/alterou**: `criado_por` no artefato e em cada versão; `atualizado_por`.
- **Relação com o CRM**: `contato_id/caso_id/processo_id` para contexto; `recurso_*` para o objeto publicado.
- **Publicar**: adaptador do tipo materializa a versão N → grava `versao_publicada = N`, `status = publicado`. **Despublicar**: desativa o recurso (formulário `ativo = false`), mantém histórico.
- **Voltar versão**: cria versão N+1 com o conteúdo da antiga (`origem = restauracao`). Nunca reescreve história. A tela mostra "rascunho com alterações não publicadas" quando `versao_atual > versao_publicada`.
- **RLS**: `is_staff()` lê e escreve; apagar/publicar só admin (ajustável). Auditoria existente registra ids e campos.
- **Formulários que já existem** ganham "Abrir no workspace": cria o artefato com versão 1 = estrutura atual (importação), sem duplicar dados.

---

## ETAPA 4 — Camada de IA

**Fluxo de uma mensagem** (`POST /api/ia/conversas/:id/mensagens`, resposta em streaming):
1. Monta o contexto: instruções fixas, **resumo do conteúdo atual do artefato** (com ids estáveis), seleção da tela (ex.: pergunta clicada), contexto do cliente/demanda **minimizado**.
2. Chama a API de Mensagens da Anthropic com a lista de ferramentas (cada uma com JSON Schema).
3. Para cada pedido de ferramenta: valida → T0/T1 executa; T2 vira proposta → devolve ao modelo "aguardando aprovação".
4. Repete até terminar (máx. 8 rodadas, teto de tokens), grava mensagens, ações e **uma versão por turno** (as operações do turno juntas).
5. Envia ao navegador: texto em streaming, "artefato atualizado (v5)", cartões de aprovação.

**Registro de ferramentas** (`server/ia/ferramentas/*.ts`), cada uma: `nome`, `descrição`, `schema`, `nível`, `executar(ctx, args)`. Exemplos para formulários:

| Ferramenta | Nível | O que faz |
|---|---|---|
| `listar_formularios`, `obter_formulario` | T0 | leitura |
| `criar_formulario` | T1 | cria artefato com estrutura completa |
| `adicionar_secao` / `renomear_secao` / `mover_secao` / `remover_secao` | T1 | seções |
| `adicionar_pergunta` | T1 | texto, tipo, opções, ajuda, obrigatória, seção, posição |
| `atualizar_pergunta` | T1 | texto, ajuda, **obrigatória**, **tipo**, opções |
| `remover_pergunta` / `reordenar_perguntas` | T1 | |
| `definir_condicao` / `limpar_condicao` | T1 | lógica "mostrar se…" |
| `publicar_formulario` / `despublicar_formulario` | **T2** | aprovação obrigatória |
| `criar_tarefa`, `criar_cliente`, `atualizar_cliente` (fases futuras) | **T2** | |

**Garantias**: schemas rígidos (recusa campos desconhecidos); limites de tamanho/quantidade; nomes de seção/pergunta resolvidos por **id estável** (ambiguidade → a IA pergunta); orçamento e limite de uso por dia; texto de cliente dentro de blocos marcados como dado; sem ANTHROPIC_API_KEY o workspace fica desativado e o construtor manual continua igual.

---

## ETAPA 5 — Workspace (interface)

```
┌ Biblioteca ┬────────── Conversa ──────────┬──────────── Artefato ────────────┐
│ Formulários│ Você: crie triagem de        │ Triagem de divórcio   v4 ▾  ● rascunho│
│ Checklists │  divórcio                    │ [Visualizar][Editar][Testar][Versões] │
│ Documentos │ IA: criei 3 seções…  (v1)    │  (editor do tipo: ConstrutorFormulario)│
│ …          │ Você: filho menor?           │ [Duplicar][Renomear][Excluir]         │
│            │ IA: adicionei (v2) ↩ Desfazer│ [Publicar] ← cartão de aprovação      │
└────────────┴──────────────────────────────┴───────────────────────────────────────┘
```
- **Visualizar / Editar / Testar** (preencher a prévia sem gravar) / **Versões** (lista, diff por operação, restaurar) / **Uso** (onde está publicado, ligado a qual serviço).
- Cada mensagem da IA mostra o que mudou ("v2: + pergunta 'Há filhos menores?'") e **Desfazer**.
- Clicar numa pergunta passa a seleção como contexto ("torne **esta** obrigatória").
- O painel direito é o componente do tipo (ex.: o próprio `ConstrutorFormulario`, com a gravação trocada: grava versão no artefato, não no formulário).

---

## ETAPA 6 — Primeiro artefato: formulário (fases pequenas)

| Fase | Entrega | Como testar |
|---|---|---|
| **F0 Fundação (sem IA)** | tabelas + RLS, registro de tipos, rotas de artefato/versões, restaurar, **tipo `formulario`** (importar existente, publicar/despublicar via `salvarEstrutura`) | testes SQL (imutabilidade, versões); Node (publicar mantém respostas, republica no mesmo id) |
| **F1 Operações do formulário** | funções puras `adicionar_pergunta`, `atualizar_pergunta`, `reordenar`, seções, condição | testes de unidade por operação, inclusive erros |
| **F2 Camada de IA** | orquestrador, ferramentas T0/T1/T2, conversas/ações, streaming; **modelo simulado nos testes** | roteiros de "modelo falso": criação, edição em 3 turnos, ferramenta inválida, T2 pendente/aprovada/recusada, limites |
| **F3 Workspace** | `/workspace` + painel "Pedir à IA" no construtor; versões e desfazer | Playwright com a IA simulada: os 6 exemplos do seu pedido |
| **F4 Ponta a ponta** | publicar → formulário aparece em `/formularios` e na ficha → preenchimento real | fluxo completo |

## ETAPA 7 — Testes (resumo)
Cobrir: criação, edição encadeada no mesmo objeto, atualização, versionamento (restaurar não apaga história), publicação/despublicação, persistência (recarregar), permissões (equipe vs admin, RLS), aprovação T2, injeção de prompt em respostas de cliente, e que **resposta já dada nunca se perde** ao republicar. Chamadas reais à Anthropic ficam fora da suíte (só manual com chave).

## ETAPA 8 — Expansão sem reconstruir
Novo tipo = **um arquivo de registro** + um componente: `schema`, `operações`, `renderizador`, `adaptador de publicação`. Ordem sugerida por valor/risco:
1. **checklist** e **documento/modelo de contrato** (marcadores `{{cliente.nome}}` → gera Word com a lib existente; sempre "minuta — revisar").
2. **tabela / estrutura de dados** (coleções próprias em jsonb, sem alterar o schema do banco).
3. **relatório** e **dashboard** (especificação de métricas sobre uma lista **fechada** de fontes do CRM; nada de SQL livre; usa KpiCard/DonutChart/DataTable).
4. **fluxo de atendimento** (etapas e transições ligadas ao funil).
5. **automação** (gatilho + condições + ações de uma lista fechada; nasce **desligada**, com simulação e aprovação T2).
6. **página/interface** (HTML em iframe isolado, CSP, sem acesso ao CRM exceto por uma ponte mínima).

## Pontos que precisam da sua decisão
1. **Chave da API (Anthropic)** e política de dados: aceita enviar dados de clientes minimizados, ou o workspace deve trabalhar só com estrutura (sem dados de clientes) no começo? *(recomendo começar só com estrutura: formulários não precisam de dados de clientes.)*
2. **Quem pode publicar**: só você (admin) ou também a equipe?
3. **Começar por F0+F1** (sem IA, ~fundação testável) e só depois ligar a IA?
