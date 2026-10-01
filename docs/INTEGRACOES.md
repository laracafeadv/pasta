> **Histórico — substituído por [GOOGLE_FORMS_E_WHATSAPP.md](GOOGLE_FORMS_E_WHATSAPP.md).** O formulário público nativo e a integração automática com a API da Meta foram descartados.

# Integrações e IA do CRM (Artifact) — o que é real e o que depende de backend

Legenda: **REAL** (funciona no Artifact) · **DISPONÍVEL** (usa conector já ligado à conta; pede autorização na 1ª vez) · **DEPENDE** (exige API/servidor) · **SIMULAÇÃO** (nunca usada como se fosse real) · **NÃO VIÁVEL** aqui.

## Premissa
O Artifact roda no navegador de quem abre. Pode: guardar dados (db), chamar **conectores** do claude.ai com as credenciais da própria usuária (mcp), pedir texto à IA (sample) e baixar arquivos. Não tem servidor, não recebe webhooks, não roda em segundo plano, não guarda segredos.

## Inventário de conectores
| Conector | Função | Permite | Não permite | Autenticação | Uso no CRM |
|---|---|---|---|---|---|
| Gmail | e-mail | buscar, ler, rascunho, enviar | baixar anexos | OAuth do conector | Comunicação por cliente/demanda, IA |
| Google Drive | arquivos | buscar, listar, criar pasta, enviar (≤8 MB), ler texto | prévia embutida; sync em segundo plano | OAuth | Painel Drive (ficha e documentos) |
| Google Agenda | agenda | criar evento, listar calendários | — | OAuth | "Criar no Google Agenda"; ICS como alternativa |
| Supabase | banco do CRM do site | SQL (o CRM só envia SELECT) | escrever (bloqueado de propósito) | OAuth + ID do projeto em Configurações › Conexões | Importa o WhatsApp que o servidor já recebe |
| Notion, Vercel | — | conectados, sem uso | — | — | não integrados |
| Goodnotes | — | não conectado | — | — | — |
Nenhum plugin instalado.

## Por área
- **IA** — REAL (sample): resumo de cliente/demanda, rascunho de resposta, leitura de intimação, comandos em linguagem natural (plano para confirmar), perguntas sobre o CRM. Ferramentas **somente leitura**: crm_buscar_pessoas, crm_ficha, crm_pendencias, agenda_proximos, gmail_buscar, drive_arquivos. CPF/RG/telefone/e-mail não vão no prompt; análise de arquivo do Drive pede confirmação por arquivo. DEPENDE: IA em rotinas sem a página aberta.
- **WhatsApp** — REAL: abrir conversa (wa.me) com mensagem pronta, modelos, registro manual ligado a cliente/demanda. DISPONÍVEL: importar (leitura) `mensagens_whatsapp` do CRM do site. DEPENDE: envio/recebimento automático, notificações, automações → WhatsApp Business Platform (ou provedor) + servidor com webhook (o site já recebe; falta fila de saída).
- **E-mail** — DISPONÍVEL: sincronizar por cliente, ler, rascunhar, enviar com confirmação, anexar (≤8 MB), vincular a cliente/demanda. NÃO VIÁVEL: baixar anexos recebidos, avisos em tempo real.
- **Drive** — DISPONÍVEL: vincular/colar pasta, criar pasta do cliente com subpastas padrão, listar, abrir, vincular arquivo a documento, enviar, analisar com IA. O arquivo fica no Drive; o CRM guarda só o vínculo.

## Hub
Cliente: cadastro · Comunicação (WhatsApp+e-mail+ligações) · Drive · Demandas · documentos · tarefas · IA.
Demanda: cliente · documentos (arquivo do Drive) · comunicação filtrada · prazos/agenda (+Google Agenda) · tarefas · IA · histórico.
Vínculo sempre por `contato_id`/`caso_id`.

## Caminho para o restante
1. WhatsApp automático: número na Business Platform → rota de envio no servidor do site → tabela de saída → CRM lê o status pela ponte.
2. Rotinas em segundo plano (e-mails novos, lembretes, IA): cron no servidor ou rotinas agendadas do Claude.
3. Sync de Drive em segundo plano: função de servidor com conta de serviço.

## Não testado ao vivo
Escritas em Gmail/Drive/Agenda e a ponte Supabase seguem os esquemas das ferramentas, mas só rodaram contra conectores simulados (`artefatos/crm-completo/testes/integracoes.mjs`). Leituras de Drive/Gmail foram conferidas com respostas reais.
