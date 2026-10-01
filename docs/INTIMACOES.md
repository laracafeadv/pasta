# Intimações e publicações no CRM

## Veredito técnico (verificado)
| Pergunta | Resposta |
|---|---|
| O Artifact recebe PUSH/notificação externa? | **Não.** Ele só roda com o CRM aberto no claude.ai; nada consegue "empurrar" dados para ele. |
| Recebe webhook / API? | **Não.** Não há endereço público e o navegador do Artifact só fala com os conectores (Gmail, Drive, Agenda). |
| API oficial (DJEN/CNJ, `comunicaapi.pje.jus.br`) | Existe e é pública (consulta por OAB), **mas recusa acesso de fora do Brasil**: testei a partir do seu Supabase (região EUA) e a resposta foi `403`. Exigiria um servidor no Brasil, fora do Artifact. Também não é "push": é consulta. |
| E-mail → CRM | **Sim, real**, por pull: o CRM lê o Gmail pelo conector quando está aberto (ou ao clicar). |
| Totalmente automático com o CRM fechado | **Não dentro do Artifact.** Só com algo externo rodando agendado (ex.: uma rotina do Claude na sua conta, que precisa da sua autorização, ou um servidor no Brasil). |


## Secretária (etapa 2): onde está e o que faz

Menu **Secretária** → abas **Intimações** e **E-mail**. Tudo é lido do seu Gmail pelo conector (`search_threads` e `get_thread`), só com o CRM aberto.

### Intimações
- Busca avisos de remetentes `@jus.br` dos últimos **14 dias** (ajustável em "Ajustes"), sem enviados/rascunhos. Alertas de login/senha/novo acesso (ex.: sso@cnj.jus.br) são **ignorados**.
- Cada item mostra: tribunal, nº CNJ, movimentação (a mais recente da tabela "Data - Movimento" do PJe Push), data, ponto de **não lida** e botão para abrir o e-mail no Gmail.
- Filtros: **Intimações e prazos** (padrão) e **Tudo**; "Ver mais" para o restante.
- **Lançar prazo**: dias, úteis/corridos, data da ciência e calendário do tribunal; o vencimento aparece **antes** de confirmar. Ao confirmar, cria o compromisso na Agenda e um evento de dia inteiro no Google Agenda com alertas **3 dias e 1 dia antes** (pop-up às 9h desses dias). O item passa a mostrar "Prazo lançado · vence dd/mm". Se o Google Agenda falhar, o prazo fica no CRM e o aviso diz que o evento não foi criado (dá para tentar de novo).
- Intimações **sem prazo lançado** entram na faixa **Hoje** e no número da aba.
- Link para o DJEN (comunica.pje.jus.br) com o aviso de que o painel **não substitui** a consulta oficial.
- O CRM nunca cria prazo sozinho; a data sugerida é só ponto de partida.

### E-mail
Abas **Principal** (7 dias, categoria Principal), **Não lidos** (14 dias) e **Tudo** (3 dias): remetente, assunto, prévia, hora, destaque de não lido e "Abrir" no Gmail. Atualiza sozinho a cada **5 minutos** enquanto essa aba está aberta (e a página visível). O CRM não marca como lido, não responde e não apaga.

### Limites
Sem push: o Artifact não recebe nada com o CRM fechado. O alerta do Google Agenda, esse sim, toca mesmo com o CRM fechado. A API do DJEN não é acessível daqui.

## Histórico do desenho anterior (Agenda › Intimações)

## O que foi implementado (Agenda › Intimações)
- **Busca no e-mail**: lê e-mails de intimação/publicação, reconhece o **número CNJ (validado pelo dígito verificador)**, e cria uma intimação por processo
  (um resumo com vários processos vira várias). Só entra e-mail com CNJ válido ou de remetente que você marcou como confiável (domínios `.jus.br` já valem).
  Depois da primeira busca bem-sucedida, o CRM busca sozinho ao abrir.
- **Vínculo**: automático só quando (1) o e-mail é de remetente oficial/confiável e (2) existe **um único** processo com aquele número no CRM.
  Qualquer dúvida → **não vinculada**, para você associar. Remetente desconhecido **nunca** vincula sozinho (há golpes que imitam intimações).
- **Datas**: recebida em (do e-mail), disponibilização/publicação (do texto; se não houver, usa a data do e-mail e avisa).
- **Prazo — nunca criado sozinho**:
  - texto com **um** prazo, dizendo **úteis ou corridos**, e com data de disponibilização/publicação → **sugere** a data pela calculadora forense do CRM
    (publicação = 1º dia útil após a disponibilização; conferência obrigatória de feriados/suspensões);
  - qualquer dúvida (sem "úteis/corridos", mais de um prazo, sem data) → **"Prazo a revisar"**, sem data;
  - criar o prazo exige abrir o formulário e salvar; só então ele é ligado à intimação.
- **Tela**: filtros Novas · A tratar · Não vinculadas · Prazo a revisar · Prazo próximo · Prazo vencido · Vinculadas · Tratadas (histórico) · Todas;
  detalhe com texto, origem, vínculo, prazo, histórico de eventos; aparecem em **Hoje** e no contador do menu.
- Também continuam: colar o texto de uma intimação ("Ler texto") e registrar manualmente.
- As 2 intimações de exemplo das versões antigas foram removidas: o CRM não mostra nenhuma intimação que não tenha vindo de verdade.

## Como usar
1. Agenda › Intimações › "De onde vêm as intimações": informe, se quiser, domínios de remetentes confiáveis (ex.: `jusbrasil.com.br`) e os dias de busca.
2. Clique em **Buscar no e-mail** (autorize o Gmail na primeira vez).
3. Abra cada intimação, vincule se necessário, confira o prazo sugerido e crie o prazo.

## Limites (honestos)
- Não é push: só atualiza com o CRM aberto.
- O que não chegar ao seu Gmail não entra. Intimações que existem só dentro do sistema do tribunal (painel do PJe/eproc, que exigem certificado) não passam por aqui.
- O formato dos e-mails varia por tribunal/serviço: a leitura procura número CNJ, "disponibilizado/publicado em dd/mm/aaaa" e "prazo de N dias úteis/corridos".
  Foi testada com e-mails simulados; **os primeiros e-mails reais devem ser conferidos**.
- O cálculo de prazo é auxílio, não parecer: calendários e pontos facultativos mudam (ver avisos da calculadora).
