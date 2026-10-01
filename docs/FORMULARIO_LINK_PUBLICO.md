> **Histórico — substituído por [GOOGLE_FORMS_E_WHATSAPP.md](GOOGLE_FORMS_E_WHATSAPP.md).** O formulário público nativo e a integração automática com a API da Meta foram descartados.

# Formulário por link público (cliente + demanda) — auditoria, decisão e como ativar

## 1. Auditoria: o que já existia no CRM do site (Nuxt + Supabase)
- Construtor de formulários (seções, perguntas, lógica condicional), banco de perguntas com **versão por pergunta** (`formulario_pergunta_versoes`), contextos cliente/consulta/demanda.
- `formulario_envios`: link individual (token 192 bits) por **pessoa + formulário**, validade, status enviado/visualizado/respondido; `formulario_envio_respostas`: snapshot (texto/tipo da pergunta no momento da resposta); respostas atuais em `contato_respostas` / `caso_respostas`.
- Página pública `/pc/<token>` (pré-consulta) e `/f/<token>` (formulário pós-contratação com upload ao Drive); notificação à equipe (no CRM + e-mail) ao responder.
- **Faltava:** vínculo do link com a **demanda**; data limite; estrutura **congelada** por link (versão do formulário); estados “link gerado / aberto / iniciado / cancelado”; situação do formulário (rascunho/publicado/arquivado); página pública genérica (a `/pc` tem texto de “antes da consulta” e exige um resumo livre); lista de formulários na **Pessoa** e na **Demanda**; botões copiar/WhatsApp/e-mail.

## 2. Decisão: formulário nativo × Google Forms
| Critério | A) Nativo do CRM | B) Google Forms |
|---|---|---|
| Experiência da cliente | Página própria, identidade do escritório, lógica condicional, sem conta | Boa, mas visual do Google; sem a lógica condicional do CRM |
| Armazenamento | Supabase do escritório | Planilha/Google; exige sincronizar |
| Vínculo com Pessoa e Demanda | Automático (o link já nasce ligado) | Só por campo preenchido pela cliente ou parâmetro pré-preenchido, sem garantia |
| Segurança / LGPD | Controle total: expiração, cancelamento, resposta única, ciência de privacidade registrada, RLS | Dados em conta Google; link genérico; sem expiração por cliente |
| Personalização | Total | Limitada |
| Manutenção | Código próprio (já existe a base) | Duas fontes de verdade; API do Forms limitada para criar/ler |
| Automação | Total (status, notificação, lembrete, histórico) | Depende de Apps Script/webhook |
| Dependência externa | Só Supabase + Vercel (já usados) | Google |
**Escolha: A (nativo).** Google Forms só faria sentido para pesquisa anônima em massa, que não é o caso.

## 3. O que foi implementado (no repositório)
- **Migração** `supabase/migrations/20261002100000_formulario_link_publico.sql` (aditiva): `formularios.situacao/versao/instrucoes/finalidade/mensagem_final`; `formulario_envios.caso_id, prazo_resposta, versao_formulario, estrutura (congelada), enviado_em, canal_envio, iniciado_em, consentimento_em, respondente, cancelado_em, gerado_por`; novos status; `formulario_envio_respostas.pergunta_opcoes/pergunta_versao`; gatilho que mantém `ativo` e `situacao` sincronizados.
- **API (equipe)**: `POST/GET /api/formularios/envios`, `GET/PATCH /api/formularios/envios/[id]` (enviado, cancelar, prorrogar). **API pública**: `GET/POST /api/formulario-publico/[token]` e `/iniciar`.
- **Página pública** `/formulario/<token>` (sem login, sem menu, `noindex`): identidade, título, instruções, prazo, perguntas, ciência da privacidade, “Enviar formulário” → “Formulário enviado com sucesso.”.
- **No CRM**: modal “Enviar formulário” (formulário publicado → demanda → validade → data limite → Gerar link → Copiar / WhatsApp / e-mail / Ver formulário / Ver respostas); lista “Formulários” na ficha da **Pessoa** e dentro de cada **Demanda**, com status, versão e respostas.
- **Versionamento**: ao gerar o link a estrutura é congelada no envio; a cliente responde, e o histórico mostra, exatamente aquilo. `formularios.versao` sobe quando a estrutura muda. Respostas guardam pergunta, tipo, opções e versão da época.
- **Segurança**: token 192 bits; link inexistente/expirado/cancelado respondem igual; resposta única atômica; validação com a mesma lógica condicional da tela; página pública devolve só o necessário; escrita só por service role; RLS intacta.

## 4. Testes
`tests/formulario-link/e2e.mjs`: sobe o servidor Nuxt **de produção (build)** contra um Supabase falso em memória e Chromium em tamanho de celular — 48 verificações (gerar link, vínculos, congelamento, abrir/iniciar/responder, condicional, resposta única, cancelar/expirar/prorrogar, notificação, histórico, ficha da pessoa/demanda, ausência de vazamento, página sem menu). A migração **foi aplicada no Supabase de produção em 02/10/2026** (aditiva; 24 envios anteriores intactos). O fluxo completo ainda **não foi executado contra o Supabase real** (depende do deploy do código).

## 5. Como ativar (depende de você)
1. ~~Aplicar a migração~~ — **feito** (aplicada por instruções individuais porque a ferramenta de migração expirava; registrada em `schema_migrations`).
2. **Publicar o código** (merge da branch `claude/repository-crm-rxcz8y` → deploy na Vercel). Conferir `NUXT_PUBLIC_SITE_URL` = endereço público (ex.: `https://crm.laracafe.com.br`).
3. No artifact: Configurações › Conexões → endereço do site + ID do projeto Supabase. O artifact passa a gerar o **link público real** (padrão) e a acompanhar o status/respostas pelo conector do Supabase.

## 6. Ainda não implementado / limites
- Envio **automático** por WhatsApp/e-mail: hoje abre o app com a mensagem pronta (manual). Automático depende da integração do WhatsApp (ver `WHATSAPP_AUDITORIA.md`).
- Lembretes automáticos e expiração ativa: dependem de cron (existe o de lembretes; falta incluir formulários).
- Upload e assinatura pelo celular da cliente: ainda não existem na página pública do site (existem no artifact).
- A tela “Formulários” do site ainda não tem seletor de situação (rascunho/publicado/arquivado) no construtor; o campo existe e a API aceita.
- Respostas de `formulario_envio_respostas` não são editadas no site; só consulta.
