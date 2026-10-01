> **Histórico — substituído por [GOOGLE_FORMS_E_WHATSAPP.md](GOOGLE_FORMS_E_WHATSAPP.md).** O formulário público nativo e a integração automática com a API da Meta foram descartados.

# Formulários como ponte com o cliente — arquitetura e o que é real

Legenda: **REAL** (funciona no artifact hoje) · **REAL VIA CONECTOR** (funciona usando o Supabase/Gmail/Drive já ligados à conta; não testado ao vivo) · **DEPENDE** (precisa de backend/API) · **SIMULADO** (só demonstra).

## A premissa que decide tudo
Um artifact só abre para quem está logado no claude.ai e tem acesso a ele; e o banco do artifact (`db`) só aceita escrita de quem está logado. **Logo, a cliente não pode responder dentro do artifact sem criar conta.** O link público sem login, que a cliente abre no celular, só existe no **CRM do site** (Nuxt + Supabase, rota `/pc/<código>`), que já tem: link individual por código (192 bits), validade, status enviado/visualizado/respondido, resposta única, aviso de privacidade, notificação à equipe (no CRM e por e-mail) e gravação das respostas com a pergunta "congelada".
O artifact é a **mesa de trabalho do escritório**: desenha o formulário, gera o link (no site, pelo conector), envia, acompanha, recebe, revisa e leva ao cadastro.

## Jornada e classificação
| Etapa | Como funciona | Classificação |
|---|---|---|
| Criar/editar/duplicar/arquivar/excluir formulário; perguntas (criar, editar, excluir, duplicar, reordenar, obrigatória); seções; lógica condicional; instruções, finalidade (LGPD), mensagem final, validade; prévia | Construtor no artifact; situação rascunho → publicado → arquivado | REAL |
| Tipos: texto curto/longo, número, data, **horário**, seleção única, múltipla, lista, sim/não, telefone, e-mail, **CPF/CNPJ** (valida dígitos), **endereço**, **envio de arquivo** (PDF/foto, 10 MB), **assinatura** (desenhada) | Só entram os que a rotina usa; sem busca de CEP (o ambiente bloqueia consultas externas) | REAL no artifact · DEPENDE para o site exibir os novos tipos |
| Gerar link individual por cliente (e por demanda) | Token de 192 bits; vínculo ao cadastro e à demanda; validade e prazo de resposta | REAL (teste/atendimento) · REAL VIA CONECTOR (link real do site) |
| Enviar por WhatsApp | Abre o WhatsApp com a mensagem e o link prontos; só marca "enviado" depois de abrir | REAL (manual) · DEPENDE (envio automático: API oficial do WhatsApp) |
| Enviar por e-mail | Compositor do Gmail com assunto e texto prontos; marca "enviado" ao enviar | REAL VIA CONECTOR |
| QR Code | Para atendimento presencial | REAL (só com link real) |
| Cliente preenche pelo celular, sem login | Página do site (`/pc/<código>`) | REAL VIA CONECTOR |
| Preencher junto com a cliente (atendimento) / teste do fluxo | Página da cliente dentro do artifact, com consentimento, autosave parcial, upload para o Drive e assinatura | REAL (a própria Dra. digita) |
| Receber respostas | Aba “Envios e respostas”: a revisar, aguardando, respondidos, expirados; selo “Nova”, item no Hoje, contador no menu; “Buscar respostas do site” (somente leitura) | REAL · REAL VIA CONECTOR |
| Notificação instantânea (push/e-mail) ao responder | O site já avisa a equipe e envia e-mail; o artifact só sabe quando está aberto ou ao buscar | DEPENDE |
| Revisar, marcar revisado, editar internamente (original preservado), exportar CSV | — | REAL |
| Levar ao cadastro | Cada pergunta pode ser ligada a um campo (nome, telefone, e-mail, nascimento, CPF, RG, estado civil, profissão, nacionalidade, endereço). **Nada é gravado sem conferência**; onde já existe valor diferente, a proposta vem desmarcada; cada mudança fica no histórico (antes → depois) | REAL |
| Arquivos → demanda | Upload vai para a pasta do cliente no Drive e é ligado ao documento pendente da demanda | REAL VIA CONECTOR (exige pasta vinculada) |
| Status | gerado, enviado, visualizado, iniciado, parcial, respondido, expirado, cancelado (+ “prazo vencido”); formulário: rascunho, publicado, arquivado | REAL (no site existem só enviado/visualizado/respondido) |
| Reenviar, copiar link, lembrete, prazo, expiração, pendentes | Lembrete manual com mensagem pronta; aparece no Hoje após N dias; prorrogar; cancelar (encerra também no site) | REAL · lembrete **automático** DEPENDE (agendador no servidor) |

## Segurança e LGPD
- **Link individual** (192 bits), validade, resposta única, cancelamento e prorrogação. Quem tem o link consegue responder: o aviso diz para enviar só à própria cliente. Não há segundo fator.
- **Identificação**: o link identifica o cadastro; a página pergunta “quem está preenchendo?” (declarado) e registra a **ciência do aviso de privacidade** com data/hora.
- **Minimização**: o construtor avisa quando o formulário coleta CPF, endereço, arquivo ou assinatura e pede a **finalidade**, que é mostrada à cliente.
- **Quem vê as respostas**: quem tem acesso ao artifact (hoje, só você). Respostas não vão para a IA.
- **Documentos**: ficam no Drive da advogada, não no artifact; o CRM guarda só o vínculo.
- **Assinatura desenhada** vale como ciência/consentimento (assinatura simples). Procuração e contrato continuam exigindo assinatura própria (manuscrita, gov.br ou ICP-Brasil).
- Retenção/descarte: não há expurgo automático (DEPENDE de rotina). Cada resposta pode ser removida excluindo o envio/cliente.

## Escrita no banco do site (única)
Só duas instruções, montadas pelo CRM e validadas por molde: `INSERT` em `formulario_envios` (formulário, pessoa, código, validade, status) com confirmação, e `UPDATE … set expira_em = now()` para cancelar. Qualquer outro SQL é recusado. Pré-requisitos: endereço do site e ID do projeto em Configurações › Conexões; a pessoa (por telefone) e o formulário (por nome) já precisam existir no CRM do site.

## Limites honestos
- O formulário do **artifact** e o do **site** são cópias separadas: o cliente vê o que está no site. O artifact avisa se a pessoa/formulário não existe lá.
- O site ainda não renderiza horário, CPF/CNPJ, endereço, arquivo e assinatura, nem lê o `mapear`/`finalidade`: para a cliente usar esses campos pelo celular, é preciso levar os tipos para `shared/data/formulario.ts` e para a página `/pc` (trabalho de desenvolvimento).
- Nada disto foi executado contra o Supabase/Gmail/Drive reais: os testes (`testes/formularios.mjs`) usam conectores simulados.

## Caminho para o resto
1. Levar os 5 novos tipos, instruções e finalidade ao site (tipos compartilhados + página + validação no servidor) e sincronizar formulários artifact → site.
2. Upload do celular da cliente: rota no site que grava no Drive pela conta de serviço.
3. Lembretes e expiração automáticos: agendador no servidor (já existe `server/api/cron`).
4. WhatsApp automático: API oficial + fila de saída (ver `INTEGRACOES.md`).
