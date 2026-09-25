# Onde hospedar o CRM (advogada autônoma)

O CRM tem duas partes, hospedadas separadamente:

| Parte | Onde | Por quê | Custo aproximado* |
|---|---|---|---|
| Banco de dados, login e arquivos | **Supabase**, região **São Paulo (sa-east-1)** | Dados de clientes ficam no Brasil (LGPD) e já vêm com login, segurança por linha (RLS) e armazenamento | Plano **Pro**: US$ 25/mês |
| O aplicativo (telas + API + webhook do WhatsApp) | **Vercel** | Deploy automático a cada `git push`, HTTPS, domínio próprio e agendador (cron) inclusos | Plano **Pro**: US$ 20/mês |

\*Preços de referência; confira nos sites antes de contratar.

**Por que não os planos gratuitos:** o Supabase Free *pausa* o projeto após uma semana sem uso e não tem backup diário. Isso não serve para dados de clientes. Pelos termos, a Vercel Hobby é só para uso não comercial, e um escritório é uso comercial.

**Alternativa mais barata:** Supabase Pro + **Render** (Web Service "Starter", ~US$ 7/mês) ou um VPS com Coolify (veja `DEPLOYMENT-coolify.md`). Nesse caso, o agendador de lembretes precisa ser externo (ex.: cron-job.org chamando `/api/cron/lembretes`). Isso dá mais trabalho de manutenção. Para quem está sozinha, a Vercel compensa.

---

## 1. Supabase (uma vez)

1. Em supabase.com, crie um projeto e escolha **Region: South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas.
2. Em **Settings → Billing**, mude para o plano **Pro** (backups diários, sem pausa).
3. No **SQL Editor**, rode os arquivos de `supabase/migrations/` **em ordem**, do mais antigo ao mais novo. Outra opção: `npx supabase link` + `npx supabase db push`.
4. Em **Authentication → Providers → Email**, desative "Allow new users to sign up". Só você cria usuários.
5. Em **Authentication → URL Configuration**, coloque `https://crm.laracafe.com.br` em *Site URL*.
6. Em **Settings → API**, copie a URL, a chave publicável e a chave secreta (vão para as variáveis abaixo).

### Primeiro acesso (não existe senha padrão)
1. Em **Authentication → Users → Add user**, informe seu e-mail e uma senha forte. Marque "Auto confirm".
2. No **SQL Editor**, rode:
   ```sql
   update public.profiles set role = 'admin' where email = 'SEU-EMAIL';
   ```
3. Entre em `https://crm.laracafe.com.br/login`. Depois disso, preencha **Configurações → Dados do escritório**: é daí que a Ana e as mensagens tiram nome, valores, PIX e posicionamento.

## 2. Vercel

1. Em vercel.com, entre com o GitHub e clique em **Add New → Project** → repositório `pasta`.
2. **Root Directory:** `crm-app`. O framework é detectado como Nuxt.
3. Em **Settings → General → Node.js Version**, escolha 22.x.
4. **Environment Variables** (Production). Os nomes estão em `.env.example`:
   - `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SECRET_KEY`
   - `NUXT_PUBLIC_SITE_URL=https://crm.laracafe.com.br`
   - `OPENAI_API_KEY` (e, se quiser, `OPENAI_MODEL`)
   - `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_DRIVE_PASTA_CLIENTES`
   - `CRON_SECRET`: uma frase longa e aleatória (≥ 16 caracteres). A Vercel a envia sozinha ao chamar o cron.
   - As variáveis `RESEND_*` não são necessárias para quem trabalha sozinha.
5. Clique em **Deploy**. A partir daí, cada `git push` na branch de produção publica sozinho.
6. **Domínio:** em **Settings → Domains**, adicione `crm.laracafe.com.br`. No painel onde o domínio está registrado (Registro.br ou outro), crie o registro **CNAME** `crm → cname.vercel-dns.com`. O HTTPS sai automático.
7. **Lembretes:** o `vercel.json` já agenda `/api/cron/lembretes` todo dia às 7h (Brasília). Confira em **Settings → Cron Jobs**.

## 3. WhatsApp Business: o mesmo número no celular e no CRM (coexistência)

Com a coexistência, você **continua usando o app WhatsApp Business no celular** e o mesmo número passa a funcionar também pela API oficial (Cloud API), que é o que o CRM usa.

- O que chega de clientes aparece no CRM e no celular.
- O que você responde **pelo celular** também aparece no CRM (a Meta envia um "eco" da mensagem). Quando isso acontece, o CRM **pausa a Ana naquela conversa**, para ela não responder por cima de você.

Passo a passo:
1. Atualize o app **WhatsApp Business** no celular para a versão mais recente. O número precisa estar ativo no app há algum tempo.
2. Em developers.facebook.com, crie um app do tipo **Business** e adicione o produto **WhatsApp**. Vincule o app ao seu **Meta Business Portfolio** (verificado, se possível).
3. Conecte o número pelo fluxo **Embedded Signup** e escolha **"Conectar um número existente do WhatsApp Business app"**. O fluxo mostra um QR code: leia com o app no celular, em *Configurações → Conta → Plataforma de negócios*. Se o seu app não oferecer essa opção, use um provedor oficial (BSP) que ofereça coexistência, como 360dialog, Twilio ou Gupshup: eles fazem esse passo por você.
4. Gere um **token permanente** (Business Settings → Usuários do sistema → gerar token com `whatsapp_business_messaging` e `whatsapp_business_management`) e copie o **Phone number ID**.
5. Em **WhatsApp → Configuração → Webhook**:
   - URL: `https://crm.laracafe.com.br/api/whatsapp/webhook`
   - Token de verificação: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`
   - Assine os campos **messages** e **smb_message_echoes** (este último traz o que você responde pelo celular).
6. Copie o **App Secret** (Configurações do app → Básico) para `WHATSAPP_APP_SECRET`. Sem ele, o CRM recusa o webhook em produção.

Se a coexistência não estiver disponível para o seu número, restam duas saídas: migrar o número de vez para a API (aí você usa só o CRM, sem o app no celular) ou usar um **número novo** só para a Ana/CRM.

## 4. Google Drive

Os passos estão no manual de compliance (`docs/manual-compliance.html`, seção Drive). Resumo:
1. Crie uma conta de serviço no Google Cloud e ative a **Google Drive API**.
2. Crie um **Drive compartilhado** do escritório, com a pasta "Clientes".
3. Adicione o e-mail da conta de serviço como **Gerente de conteúdo**.
4. Cole o ID da pasta em `GOOGLE_DRIVE_PASTA_CLIENTES`.

## 5. Checklist depois do deploy
- [ ] Login funciona e seu usuário é admin.
- [ ] Configurações → Dados do escritório preenchidos (inclusive valor da consulta, PIX e posicionamento).
- [ ] Mensagem de teste de outro celular chega em **CRM → Hoje**.
- [ ] Resposta sua pelo celular aparece na conversa e a Ana pausa.
- [ ] "Pasta no Drive" cria a estrutura 00–06/99 na ficha de um cliente de teste.
- [ ] O link do formulário (`/f/...`) abre numa janela anônima e o anexo cai na pasta 01 do cliente.
- [ ] Em Supabase → Database → Backups, aparece o backup diário.
