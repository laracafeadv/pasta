# Google Forms + Planilhas e WhatsApp exportado (arquitetura vigente do CRM)

Esta é a arquitetura em uso. Ela **substitui** o formulário público nativo (GitHub Pages + Supabase) e a integração
automática com a API da Meta, descritos em `FORMULARIO_LINK_PUBLICO.md`, `FORMULARIOS.md`, `INTEGRACOES.md` e
`WHATSAPP_AUDITORIA.md` (mantidos só como histórico). Sem Vercel.

## 1. Formulários = Google Forms + Google Sheets → CRM

```
Você cria o formulário no Google Forms
→ o Google guarda as respostas numa planilha (Sheets)
→ no CRM: Formulários › Cadastrar formulário (link + planilha + qual coluna é o código)
→ no CRM: Enviar formulário (Pessoa + Demanda) → o CRM gera um CÓDIGO e põe no link
→ a cliente responde no Google
→ o CRM lê a planilha (Google Drive, como você), reconhece o código e guarda a resposta ligada à Pessoa e à Demanda
```

### Configuração (uma vez por formulário)
1. **Google Forms**: crie uma pergunta de resposta curta chamada **Código do atendimento** (de preferência a última; na descrição
   escreva “Não altere este campo”).
2. Menu ⋮ › **Receber link pré-preenchido** › preencha “Código do atendimento” com a palavra `CODIGO` (maiúsculas) › **Obter link** › copie.
3. Aba **Respostas** › **Vincular ao Planilhas** › criar planilha. Abra a planilha e copie o endereço (a 1ª aba deve ser a das respostas).
4. No CRM: **Formulários › Cadastrar formulário** → cole o link (passo 1) e o endereço da planilha → **Ler colunas da planilha** →
   marque qual coluna é o **CÓDIGO** e, nas colunas que são dado cadastral (e-mail, telefone, CPF, nome…), “Levar ao cadastro” → **Ativar formulário**.
5. Na primeira leitura o claude.ai pede autorização ao conector **Google Drive** (a ferramenta `download_file_content`, que exporta a planilha em CSV).

### Uso
- **Enviar**: ficha da Pessoa/Demanda › Enviar formulário (ou Formulários › Enviar). Escolha a demanda → **Gerar envio**.
  O painel mostra o link com o código, a mensagem pronta, **e-mail pelo Gmail** (envio real, com confirmação),
  **abrir o WhatsApp com o texto pronto** (você toca em enviar) e QR Code.
- **Receber**: Formulários › Envios e respostas › **Ler respostas do Google** (também lê sozinho ao abrir o CRM, depois da 1ª leitura bem-sucedida).
- **Identificação**: pelo código `LC-<pessoa>-<demanda>-XXXX`. Resposta sem código ou com código desconhecido vai para
  **“Respostas sem identificação”**, com sugestão pelo e-mail/telefone; nada é ligado sozinho — você escolhe Pessoa e Demanda ou ignora.
- **Reenvio com o mesmo código** vira um segundo registro; o primeiro fica intacto.
- **Cadastro**: “Revisar e aplicar” mostra antes → depois; nada é gravado sem a sua conferência.

### Limites (do Google Forms, não do CRM)
- O link não expira e não é “individual” de verdade: quem tiver o link pode responder; o campo do código pode ser alterado por quem preenche.
- Cancelar o envio no CRM não fecha o formulário no Google (feche lá se quiser parar de receber).
- O CRM só lê a planilha com o CRM aberto (ou ao clicar). Aviso automático de resposta nova exigiria rotina fora do Artifact.
- Uploads de arquivo no Google Forms ficam no Drive de quem criou o formulário; o CRM guarda apenas o link que aparece na planilha.
- A leitura da planilha foi implementada contra o esquema documentado do conector (CSV em base64; texto/tabela como alternativa) e testada com
  um conector simulado; **a primeira leitura real precisa ser conferida** — se falhar, a tela mostra o motivo.

## 2. WhatsApp Business → exportação → CRM → IA

```
Você usa o WhatsApp Business normalmente
→ Exportar conversa (Sem mídia) → arquivo .txt (ou .zip)
→ CRM: Comunicação › Importar conversa do WhatsApp
→ o CRM separa quem escreveu o quê, liga à Pessoa e à Demanda e guarda o histórico (sem duplicar)
→ Assistente da conversa (IA): análise, resumo, o que falta, documentos, fatos, pendências, rascunhos e simulação
→ você revisa, copia e envia SOZINHA pelo WhatsApp
```

- **Exportar**: Android — conversa › ⋮ › Mais › Exportar conversa › Sem mídia. iPhone — nome do contato › Exportar conversa › Sem mídia.
  Envie o arquivo para você mesma (e-mail ou Drive) e escolha-o no CRM. Também dá para colar o texto.
- **Formatos lidos**: Android (`12/03/2024 14:05 - Nome: texto`), iPhone (`[12/03/2024 14:05:10] Nome: texto`), data dd/mm ou mm/dd (detectada),
  12 h com AM/PM, mensagens de várias linhas, avisos do sistema ignorados, mídia omitida marcada.
- **Importar de novo** o mesmo arquivo (ou um mais novo) só acrescenta o que ainda não existe.
- **Buscar** dentro da conversa (sem diferenciar acentos); **vincular** a conversa inteira a uma Demanda.
- **IA**: usa a sua conta Claude, com consentimento. Recebe a conversa (até 120 mensagens/14 mil caracteres) e a ficha sem CPF, RG, endereço,
  telefone e e-mail. O que a cliente escreveu nas mensagens vai como está. **Nunca envia nada**: não há botão de envio na IA.
- **Não existe**: receber mensagens sozinho nem enviar pelo CRM (exigiria a API da Meta + servidor externo; descartado por decisão da usuária).

## 3. O que ficou desativado/removido
- Removidos do CRM: formulário público nativo, construtor de perguntas, publicação no Supabase, “Link público de formulário”, integração WhatsApp Cloud API
  (fila, modelos, janela de 24 h, números novos), conector Supabase do manifesto.
- Removidos do repositório: `docs/formulario/` (página pública) e seu teste.
- **Ainda existem, sem uso** (a remoção depende de confirmação): a Edge Function `crm-api` e as tabelas/trigger/cron no Supabase
  (`supabase/migrations/2026100*`), e o código correspondente em `supabase/functions` e `tests/whatsapp`.
- Nenhuma alteração foi feita no WhatsApp Business real.
