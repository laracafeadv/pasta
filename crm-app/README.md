# CRM Lara Café Advocacia & Consultoria

Sistema interno do escritório: CRM de contatos e clientes, funil de atendimento, honorários, relatórios e uma **assistente de IA no WhatsApp** que faz a triagem, preenche a ficha e passa a conversa para a equipe quando precisa.

Adaptado do projeto [`loboczss/crm-advogada`](https://github.com/loboczss/crm-advogada) (Nuxt 4 + Supabase), com a identidade visual do site [laracafe.com.br](https://laracafe.com.br).

---

## O que o sistema faz

| Tela | Para quê |
|---|---|
| **CRM → Hoje** | Tela inicial. Casos atrasados, compromissos do dia, casos **sem próxima ação** e conversas que aguardam a equipe. |
| **CRM → Funil** | Novo contato → Consulta agendada → Diagnóstico → Proposta enviada → Cliente ativo → Concluído / Não contratou. Arrastar um cartão pede o próximo passo. |
| **CRM → Contatos** | Base completa com busca e filtros. Ficha 360: caso, conversa de WhatsApp, atividades e honorários. |
| **Honorários** | Propostas, contratos e recebimentos por cliente. |
| **Painel / Relatórios** | Novos contatos, taxa de fechamento, origem dos clientes, áreas e motivos de perda. |
| **Assistente IA** | Instruções da assistente, base de conhecimento (PDF, Word, planilhas, imagens) e aba **Testar** para conversar com ela antes de ligar no WhatsApp. |
| **Mensagens** | Biblioteca de mensagens prontas (playbook "Scripts que Vendem"): triagem, agendamento, documentos, proposta, objeções, follow-up, financeiro, NPS. Na conversa, digite `/` para usar. |
| **Equipe → Auditoria** | Quem fez o quê e quando. Registro imutável, sem conteúdo dos dados (LGPD). |
| **Equipe** | Criação de usuários e níveis de acesso. |

### Estratégias dos playbooks (Desafio Comercial Diamante)
- **Etapas com comportamento próprio:** Novo contato → *Em qualificação* → Consulta agendada → Diagnóstico → Proposta enviada → Cliente ativo.
- **Cadência sugerida:** ao registrar andamento, o sistema propõe o próximo passo da etapa (ex.: follow-up 24h → 7 dias → final) e a mensagem pronta correspondente.
- **Caça aos gargalos** (Relatórios): contatos por etapa, tempo médio parado e a etapa prioritária da semana; contagem de quem "sumiu" (7+ dias sem responder).
- **Checklist de documentos** por área, com cobrança dos pendentes em um clique.
- **Classificação da carteira** (promotora, neutra, fria, detratora) — o NPS classifica sozinho; **aniversários** aparecem em "Hoje".

### Regras do método embutidas no sistema
- Todo caso aberto precisa de **próxima ação com data**. Sem isso, ele aparece em "Sem próxima ação".
- **"Feito" / mudar de etapa** registra o que aconteceu e obriga a decidir o próximo passo, ou encerrar o caso.
- **"Não contratou"** exige o motivo, que alimenta o relatório de perdas.
- **Conflito de interesses:** ao cadastrar, ou quando a IA descobre a parte contrária, o sistema avisa se ela já é cliente (ou o contrário).

### Níveis de acesso
| Nível | Acesso |
|---|---|
| `admin` | Tudo, inclusive a configuração da IA e a gestão da equipe. |
| `equipe` | CRM, conversas, honorários, painel e relatórios. |
| `user` | Nenhum dado. Fica em "aguardando liberação". |

Não há autocadastro: os usuários são criados pela administração em **Equipe**.

---

## Ana — assistente de IA no WhatsApp

**Como funciona**
1. Uma pessoa escreve para o WhatsApp do escritório. A Meta envia a mensagem para `/api/whatsapp/webhook`.
2. O CRM cria o contato (ou encontra o existente) e grava a mensagem.
3. Se a assistente estiver ativa para aquele contato, ela espera alguns segundos (para juntar mensagens seguidas) e responde. No primeiro contato, envia antes o **aviso de privacidade (LGPD)**.
4. A cada resposta, a IA atualiza a ficha: área, demanda, resumo, urgência, sentimento, pontos de atenção, objeções e parte contrária. Ela **não sobrescreve** o que a equipe já preencheu (nome, cidade, área…).
5. Ela **transfere para a equipe** quando a pessoa pede, em caso de violência, risco, prisão ou prazo judicial, ou quando não sabe responder. Nesse caso a IA é pausada no contato, a equipe é notificada e o caso aparece em "Hoje".
6. A equipe responde pela aba **Conversa** da ficha. Ao responder, a IA é pausada automaticamente. O botão "Devolver para a IA" reativa a assistente.

**Regras fixas (não editáveis pela tela):** estão em `server/utils/agentePrompt.ts`. Ela se apresenta como **Ana, do escritório**; nunca afirma ser humana e, se perguntarem diretamente, diz que é a assistente virtual. Não dá parecer jurídico. Não promete resultado. Não informa honorários que não estejam na base de conhecimento. Não pede documentos nem dados sensíveis. Em caso de risco, orienta a ligar 190/180 e transfere para a equipe. Essas regras seguem o Código de Ética da OAB, o Provimento 205/2021 e a LGPD. **Revise o texto com a sua leitura profissional antes de ativar.**

**Limitações atuais**
- **Áudio, imagem e documento:** a assistente não lê. Ela pede para a pessoa escrever, ou avisa que a equipe vai ver.
- **Janela de 24h do WhatsApp:** passadas 24h desde a última mensagem da cliente, o WhatsApp só aceita *modelos aprovados* pela Meta. O CRM avisa quando o envio falha por isso. O envio de modelos ainda não foi implementado.
- **Janela aberta:** a resposta roda logo após o webhook responder à Meta. Em hospedagens *serverless* que encerram o processo ao responder, o processamento pode ser cortado. Prefira um servidor Node contínuo (VPS, Coolify, Render, Railway).

---

## Implantação passo a passo

### 1. Supabase (banco de dados e login)
1. Crie um projeto em [supabase.com](https://supabase.com). Para dados de clientes, escolha a região **São Paulo (sa-east-1)**.
2. Em **SQL Editor**, execute, nesta ordem, `supabase/migrations/20260925000000_schema_inicial.sql` e `supabase/migrations/20260925010000_playbook_e_auditoria.sql`.
3. Em **Authentication → Providers → Email**, **desative "Allow new users to sign up"**.
4. Em **Authentication → Users → Add user**, crie o usuário da Lara (e-mail e senha).
5. Entre uma vez no CRM com esse usuário. Depois, no **SQL Editor**, torne-o administrador:
   ```sql
   update public.profiles set role = 'admin' where email = 'SEU-EMAIL-AQUI';
   ```
6. Os demais usuários são criados pela tela **Equipe**.
7. Copie de **Project Settings → API** a URL, a chave pública (*publishable*) e a chave secreta (*secret*).

### 2. OpenAI
Crie uma chave em [platform.openai.com](https://platform.openai.com/api-keys) e defina um limite de gasto mensal. O modelo padrão é `gpt-4.1-mini` (variável `OPENAI_MODEL`).

### 3. WhatsApp Cloud API (Meta)
1. Em [developers.facebook.com](https://developers.facebook.com), crie um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Cadastre e verifique o número do escritório. O número **não pode** estar em uso no aplicativo WhatsApp comum ao mesmo tempo.
3. Crie um **usuário do sistema** no Gerenciador de Negócios, com permissão `whatsapp_business_messaging`, e gere um **token permanente** (`WHATSAPP_TOKEN`).
4. Copie o **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`) e o **App Secret** (em Configurações → Básico: `WHATSAPP_APP_SECRET`).
5. Em **WhatsApp → Configuração → Webhook**:
   - URL: `https://SEU-DOMINIO/api/whatsapp/webhook` (também aparece na aba *Testar* da Assistente IA)
   - Token de verificação: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
   - Assine o campo **messages**.

### 4. Hospedagem
Precisa de **Node.js 22.12 ou superior**.
```bash
cp .env.example .env   # preencha os valores
npm ci
npm run build
node .output/server/index.mjs
```
- As variáveis são lidas **no build**. Se o build for feito sem elas, defina em produção com o prefixo `NUXT_`: `NUXT_SUPABASE_SECRET_KEY`, `NUXT_OPENAI_API_KEY`, `NUXT_WHATSAPP_TOKEN`, `NUXT_WHATSAPP_PHONE_NUMBER_ID`, `NUXT_WHATSAPP_VERIFY_TOKEN`, `NUXT_WHATSAPP_APP_SECRET`, `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_PUBLIC_SITE_URL`.
- Guia específico para Coolify: `DEPLOYMENT.md`.
- Use HTTPS (o login usa cookies seguros) e um subdomínio próprio, por exemplo `crm.laracafe.com.br`.

### 5. Antes de ligar a assistente
1. Em **Assistente IA → Instruções**, revise o texto e salve.
2. Em **Base de conhecimento**, envie o que ela pode informar: valor da consulta (se quiser divulgar), documentos que costumam ser pedidos, horários.
3. Em **Testar**, simule conversas difíceis: pedido de preço, pergunta "eu tenho direito a…?", ameaça, pedido para falar com a advogada.
4. Confira em **Conexões** (aba *Testar*) se está tudo verde.

---

## Estrutura

```
app/                 telas (Nuxt/Vue)
  pages/crm/         Hoje, Funil, Contatos
  components/crm/    ficha, andamento, funil, tabela
  pages/eva.vue      Assistente IA (instruções, base, testar)
server/
  api/crm/           contatos, andamento, conflitos, estatísticas, envio WhatsApp
  api/honorarios/    honorários
  api/whatsapp/      webhook da Meta
  utils/agente*.ts   lógica e regras da assistente
  utils/atendimento.ts  fluxo de mensagens recebidas
shared/types/crm.ts  etapas, áreas, origens, motivos de perda (edite aqui)
supabase/migrations/ schema do banco com RLS
```

Para mudar etapas, áreas, demandas, origens ou motivos de perda, edite `shared/types/crm.ts` (e, se mudar as etapas, também a restrição `check` da coluna `etapa` no SQL).
