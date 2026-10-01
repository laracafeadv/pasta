# WhatsApp Cloud API — auditoria e plano (nenhuma alteração de código feita)

## 1. Diagnóstico (o que já existe no CRM do site)
Stack: Nuxt 4 (frontend + API Nitro no mesmo projeto) · Supabase (Postgres, Auth, RLS) · Vercel (projeto `pasta`, equipe `lara-cafe`) · cron `vercel.json` (`/api/cron/lembretes`, 10h UTC).

**Já é a integração oficial da Meta (Cloud API v25.0), sem intermediário:**
- `server/api/whatsapp/webhook.get.ts` — verificação (`hub.verify_token` = `WHATSAPP_VERIFY_TOKEN`).
- `server/api/whatsapp/webhook.post.ts` — recebe eventos, valida `X-Hub-Signature-256` (HMAC-SHA256 com `WHATSAPP_APP_SECRET`, timing-safe; **sem App Secret em produção, recusa**), grava ANTES de responder, guarda diagnóstico da última chamada (sem conteúdo).
- `server/utils/whatsapp.ts` — `enviarTexto`, `extrairMensagens` (texto, botão, interativo, mídia), `extrairEcos` (**coexistência**: o que você digita no app do celular, `smb_message_echoes`), `baixarMidia`.
- `server/utils/atendimento.ts` — `processarMensagem` (acha a pessoa por telefone normalizado, cria se não existir, deduplica por `wa_message_id` único, notifica a equipe), `enviarPelaEquipe` (**só grava a saída se a Meta aceitou**; erro 131047 = fora da janela de 24h, com mensagem clara).
- `server/api/crm/contatos/[id]/whatsapp.post.ts` — envio pelo CRM (exige equipe autenticada, audita).
- `server/utils/midia.ts` / `ecos.ts` — áudio/imagem/documento baixados e guardados; ecos só para quem já é contato.
- UI: aba **Conversa** em `ContatoDetailModal.vue` (histórico, mídia, mensagens prontas, sugestão de resposta, enviar). Página `mensagens.vue` = biblioteca de modelos (não é caixa de conversas).
- Banco: `mensagens_whatsapp` (id, created_at, contato_id, direcao, autor, autor_id, conteudo, tipo, wa_message_id UNIQUE, midia_*, transcricao, drive_url), RLS "equipe", índice (contato_id, created_at).
- Documentado em `DEPLOYMENT.md` §3 (coexistência) e `README.md`.

**Estado em produção (projeto Supabase `cuaeuazmgwdhfozrqkin`, leitura apenas):** 9 contatos; 6 mensagens (4 entradas, 2 saídas); última em 26/09/2026; último webhook recebido em 26/09/2026 03:14 UTC (1 mensagem, assinatura válida). Ou seja: a Meta **já chegou a chamar o webhook** — mas não há tráfego desde então. Não consigo ver variáveis da Vercel nem o domínio (a conexão com a Vercel está sem permissão no escopo `lara-cafe`).

## 2. Lacunas frente ao que você pediu
| # | Pedido | Situação |
|---|---|---|
| 1,2,3,4,7,8 | ver conversas, receber, enviar, histórico, identificar por telefone, data/hora | **Existe** (por pessoa, dentro da ficha) |
| 5 | caixa de conversas (lista + busca) | **Falta** (só dentro da ficha da pessoa) |
| 6 | vincular à **Demanda** | **Falta**: `mensagens_whatsapp` não tem `caso_id` (a demanda é a tabela `casos`) |
| 9 | status enviado/entregue/lido | **Falta**: o webhook ignora `statuses` |
| 10 | histórico no banco | Existe |
| 11 | templates aprovados | **Falta** (nem tabela nem envio `type: template`) |
| 12 | atualizar sem recarregar | **Falta** (Realtime não está habilitado para a tabela; publicação `supabase_realtime` vazia) |
| — | "nunca criar Pessoa duplicada; número desconhecido → vinculação manual" | Hoje número desconhecido **cria um lead novo** automaticamente (por padrão do funil). Proponho: continuar criando como lead, mas marcado “não confirmado” e sem mesclar sozinho |
| — | várias Demandas na mesma pessoa | Não escolhe nada hoje; proponho `caso_id` nulo até você selecionar |
| — | tabela `conversas` | Não é necessária: conversa = pessoa (+ `caso_id` opcional na mensagem). Criar `conversas` duplicaria dados; só criarei se você quiser vários números/atendentes |

## 3. Plano (aproveitando 100% da arquitetura atual)
**Banco (uma migração):** `mensagens_whatsapp` + `caso_id`, `status` (`enviando|enviada|entregue|lida|falhou`), `status_em`, `erro`, `metadata jsonb`, `template_nome`; tabela `whatsapp_templates` (nome, idioma, categoria, status Meta, corpo, variáveis — sincronizada da Meta, nada hardcoded); `whatsapp_eventos` (log bruto dos webhooks, para auditoria e reprocessamento); habilitar Realtime em `mensagens_whatsapp`.
**Backend:** (a) processar `statuses` do webhook atualizando a mensagem pelo `wa_message_id`; (b) envio de template (`type: template`) com regra automática (janela 24h aberta → texto livre; fechada → só template); (c) gravar a saída como `enviando` ANTES de chamar a Meta e atualizar para `enviada` ou `falhou` com o erro (fila simples e reenvio manual, sem depender de worker); (d) endpoint `GET /api/whatsapp/templates` (sincroniza da Meta); (e) endpoint de caixa de conversas (última mensagem por pessoa, não lidas, busca); (f) vincular mensagem à demanda (`PATCH`).
**Frontend:** página **WhatsApp** (lista + conversa + busca + status ✓✓ + demanda vinculada + seletor de template), atalho na ficha da Pessoa, comunicações por demanda na ficha da Demanda; Realtime para atualizar sozinho.
**Segurança:** comparação do verify token em tempo constante; limitar tamanho do corpo; reprocessamento idempotente (já há UNIQUE); nenhum token no frontend (já é assim); RLS mantida; checar `is_staff` no envio (já feito).
**Variáveis de ambiente (Vercel):** `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (já previstas) + `WHATSAPP_BUSINESS_ACCOUNT_ID` (nova, para listar templates).

## 4. O que depende de você (Meta) e o que eu faço no código
Eu faço: toda a lista acima (migração, endpoints, UI, testes locais com payloads reais da Meta simulados).
Você faz (passo a passo quando chegarmos lá): confirmar quais variáveis já estão na Vercel; app Meta/WhatsApp; número de teste; token permanente; webhook; (depois) conectar o número real.

## 5. Risco para o WhatsApp Business atual
- **Teste primeiro com o número de teste da Meta**: não toca no seu número.
- O repositório já foi desenhado para **coexistência** (app do celular + API no mesmo número, via Embedded Signup “conectar número existente”). Eu **não consegui acessar a documentação da Meta daqui** para reconfirmar as limitações atuais; antes de conectar o número real é preciso conferir lá: disponibilidade no Brasil, versão mínima do app, tempo mínimo de uso do número, e o que muda no app (a Meta costuma restringir recursos como grupos/mensagens temporárias). Nada será conectado sem sua confirmação explícita.
- Se a coexistência não estiver disponível, a alternativa seria migrar o número (desconecta do app) — **não faremos sem decisão sua**.
