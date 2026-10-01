'use strict'
/* Padrões operacionais: texto REAL de app/pages/manual.vue (gerado por extração, não reescrito) */

// Regra do CRM: cada tipo de coisa tem um único lugar.
const MANUAL_REGRAS = [
  { nome: 'Checklist', icone: 'ph:list-checks-bold', texto: 'Verificação ou etapa simples, que só precisa ser marcada como feita. Fica na ficha do cliente (atendimento) e da demanda (etapas do procedimento). Sem responsável nem prazo.' },
  { nome: 'Tarefa', icone: 'ph:check-square-bold', texto: 'Algo que exige execução, acompanhamento, responsável ou prazo interno. Fica em Tarefas e aparece no Hoje quando vence.' },
  { nome: 'Prazo', icone: 'ph:hourglass-high-bold', texto: 'Tem uma data-limite relevante (processual ou combinada). Fica em Prazos, contado em dias úteis.' },
  { nome: 'Documento', icone: 'ph:folder-bold', texto: 'Obter, conferir ou organizar documento. Fica no checklist de Documentos da ficha; o checklist do atendimento só lê o resultado.' },
  { nome: 'Hoje', icone: 'ph:sun-bold', texto: 'O que o sistema lembra e você envia (mensagens, follow-ups, aniversário). Não vira checkbox: já vira aviso no dia certo.' },
]
// Onde cada passo do fluxo vive no CRM (fase:posição).
const MANUAL_ONDE = {
  'atendimento:0': 'Automático (o contato é criado)', 'atendimento:1': 'Só orientação', 'atendimento:2': 'Hoje (próxima ação)', 'atendimento:3': 'Checklist (automático)', 'atendimento:4': 'Checklist (automático)', 'atendimento:5': 'Hoje',
  'consulta:0': 'Demanda › Informações e Análise do escritório', 'consulta:1': 'Demanda › Informações (checklist de viabilidade) + Checklist (automático)', 'consulta:2': 'Demanda › Informações', 'consulta:3': 'Demanda › Análise do escritório', 'consulta:4': 'Checklist (você marca)',
  'fechamento:0': 'Financeiro › Montar mensagem de proposta', 'fechamento:1': 'Financeiro + Checklist (automático)', 'fechamento:2': 'Hoje', 'fechamento:3': 'Checklist (automático)', 'fechamento:4': 'Checklist (enviado: você marca; assinado: Documentos)',
  'caso:0': 'Checklist (automático)', 'caso:1': 'Automático', 'caso:2': 'Só orientação', 'caso:3': 'Checklist (automático)', 'caso:4': 'Documentos',
  'acompanhamento:0': 'Prazos', 'acompanhamento:1': 'Hoje', 'acompanhamento:2': 'Relatórios (Qualidade)', 'acompanhamento:3': 'Hoje', 'acompanhamento:4': 'Automático',
  'encerramento:0': 'Checklist (automático)', 'encerramento:1': 'Hoje', 'encerramento:2': 'Checklist (você marca) + NPS automático', 'encerramento:3': 'Checklist (você marca)', 'encerramento:4': 'Remarketing',
}

const MANUAL_FASES = [
  {
    id: 'atendimento',
    nome: '1. Atendimento inicial',
    resumo: 'Do primeiro "oi" no WhatsApp até a consulta agendada e paga.',
    passos: [
      { titulo: 'A cliente escreve no WhatsApp', texto: 'A conversa entra no CRM, o contato é criado e você recebe um aviso. Quem responde é você (ou a equipe), pelo CRM, com as mensagens prontas.', automatico: 'avisa' },
      { titulo: 'Triagem x consulta', texto: 'A triagem é gratuita e só entende os fatos. A partir do momento em que se analisa direitos, riscos e estratégia da situação concreta, é consulta — e é paga.' },
      { titulo: 'Convite para a consulta', texto: 'Depois da triagem, o sistema sugere convidar para a consulta estratégica (mensagem /consulta) e move o contato para "Em qualificação".', automatico: 'avisa' },
      { titulo: 'Pagamento e agendamento', texto: 'Confirma o pagamento (PIX) e agenda o horário. Ao registrar, o contato vai para "Consulta agendada" e entra na Agenda.' },
      { titulo: 'Formulário pré-consulta', texto: 'Um clique já gera o link e copia pra você: abra a ficha da cliente e clique em "Gerar e copiar link do formulário". É só colar no seu WhatsApp normal e mandar. Só tem o resumo livre — se quiser perguntar algo específico desta demanda, use "+ perguntas desta demanda" antes de gerar o link.' },
      { titulo: 'Lembrete', texto: 'No dia anterior, o sistema lembra de mandar a mensagem /lembrete com data, hora e link — mas é você que manda.', automatico: 'avisa' },
    ],
    links: [{ nome: 'Ir para o Hoje', to: '/crm' }, { nome: 'Mensagens prontas', to: '/mensagens' }],
  },
  {
    id: 'consulta',
    nome: '2. Consulta e análise',
    resumo: 'A análise da demanda: os 5 porquês, a viabilidade e o que está em jogo.',
    passos: [
      { titulo: 'Roteiro da consulta', texto: 'Na ficha, abra a demanda de consulta (um clique em Demandas) e registre o que a cliente trouxe, os 5 porquês até a causa raiz (em Análise do escritório) e o objetivo real dela.' },
      { titulo: 'Checagem de viabilidade', texto: 'Na demanda, marque no checklist de viabilidade prescrição, competência, provas e conflito de interesses. Registre os riscos por escrito em Análise do escritório — eles vão para a proposta.' },
      { titulo: '"O que está em jogo"', texto: 'Na demanda, registre o que está em jogo e o valor aproximado (a meação, a pensão, o patrimônio) para ancorar o valor do honorário.' },
      { titulo: 'Decisão', texto: 'Em Análise do escritório, marque viável, com ressalvas ou inviável. Fica na demanda e no histórico.' },
      { titulo: 'Feedback pós-consulta', texto: 'No dia seguinte, o sistema lembra de mandar a mensagem /feedback e avisa que a proposta vem em até 2 dias úteis — mas é você que envia.', automatico: 'avisa' },
    ],
    links: [{ nome: 'Ir para o Hoje', to: '/crm' }],
  },
  {
    id: 'fechamento',
    nome: '3. Proposta e fechamento',
    resumo: 'Da proposta enviada ao contrato assinado.',
    passos: [
      { titulo: 'Montar a proposta', texto: 'Na aba Financeiro da ficha, "Montar mensagem de proposta" usa o honorário registrado para a demanda.' },
      { titulo: 'Registrar o honorário', texto: 'Contrato fixo, êxito, assessoria mensal ou em camadas (arranque + mensal + % de êxito) — o que fizer sentido para a demanda. O honorário fica vinculado à demanda; cada demanda tem a sua proposta.' },
      { titulo: 'Follow-up de proposta', texto: '24h depois da proposta, 7 dias depois, e um follow-up final aos 14 dias — o sistema avisa em cada marco com a mensagem certa, mas é você que manda.', automatico: 'avisa' },
      { titulo: 'Dados para o contrato', texto: 'Depois de fechar, envie o link com /formulario: reúne CPF, endereço e demais dados formais pra procuração e contrato. É diferente do formulário pré-consulta — esse aqui só faz sentido depois que ela já fechou.' },
      { titulo: 'Contrato e procuração', texto: 'Gere os dois em Word a partir da ficha, já com a qualificação preenchida.' },
    ],
    links: [{ nome: 'Ir para o Financeiro', to: '/honorarios' }],
  },
  {
    id: 'caso',
    nome: '4. Abertura do processo ou procedimento',
    resumo: 'Cliente contratou: organizar a pasta e, se houver, registrar o processo judicial ou o procedimento extrajudicial da demanda.',
    passos: [
      { titulo: 'Pasta no Google Drive', texto: 'Ao criar a pasta do cliente (ou automaticamente, no primeiro documento), o sistema cria a estrutura padrão: Recebidos, Documentos pessoais, Contrato, Peças, Provas, Comunicações, Financeiro e Arquivo.', automatico: 'faz' },
      { titulo: 'Arquivos do WhatsApp', texto: 'Fotos e documentos que a cliente manda pelo WhatsApp vão sozinhos para "00 Recebidos pelo WhatsApp" na pasta dela.', automatico: 'faz' },
      { titulo: 'Nome padrão dos arquivos', texto: 'AAAA-MM-DD_CLI-0000_TIPO_descrição_v01.ext — o código do cliente nunca expõe nome completo nem CPF.' },
      { titulo: 'Registrar processo ou procedimento', texto: 'Se houver, dentro da demanda: processo judicial (número CNJ validado, tribunal, vara) ou procedimento extrajudicial (cartório, tipo de procedimento). Partes e interessados (parte contrária, herdeiros, cônjuge) entram na própria demanda. Serviço consultivo não precisa de processo.' },
      { titulo: 'Checklist de documentos', texto: 'A lista de documentos por área já vem pronta; cobre os pendentes em um clique.' },
    ],
    links: [{ nome: 'Ir para Demandas', to: '/demandas' }],
  },
  {
    id: 'acompanhamento',
    nome: '5. Acompanhamento',
    resumo: 'Prazos, audiências e manter a cliente informada.',
    passos: [
      { titulo: 'Prazos em dias úteis', texto: 'A calculadora já considera fins de semana, feriados nacionais e o recesso de 20/12 a 20/01 (CPC art. 219/220/224).' },
      { titulo: 'Relatório semanal', texto: 'Quando um cliente ativo fica 7+ dias sem novidade registrada, a tela Hoje avisa e sugere a mensagem /relatorio-semanal — você decide se manda.', automatico: 'avisa' },
      { titulo: 'Revisão por amostragem', texto: 'Nos Relatórios, revise demandas por amostragem (prazos, próxima ação, cliente informado, documentos, financeiro). Falha vira tarefa com prazo.' },
      { titulo: 'Aniversário', texto: 'A tela Hoje avisa aniversário do dia — o convite pra mandar parabéns é seu.', automatico: 'avisa' },
      { titulo: 'Classificação da cliente', texto: 'Promotora, neutra, fria ou detratora: calculada sozinha a partir da nota do NPS, sem você precisar marcar nada.', automatico: 'faz' },
    ],
    links: [{ nome: 'Ir para a Agenda', to: '/agenda' }],
  },
  {
    id: 'encerramento',
    nome: '6. Encerramento e pós-venda',
    resumo: 'Encerrar a demanda sem perder o relacionamento.',
    passos: [
      { titulo: 'Encerrar a demanda', texto: 'Registre o resultado (êxito, parcial, acordo, sem êxito ou desistência) e a data de encerramento. Quando a última demanda encerra, o cliente passa a Concluído e segue cadastrado.' },
      { titulo: 'Pós-venda agendado', texto: 'O sistema já agenda o lembrete de contato 30 dias depois (/pos-venda-30) e outro 1 ano depois (/pos-venda-1ano) — aparece na tela Hoje na hora certa, mas é você que envia.', automatico: 'avisa' },
      { titulo: 'Pesquisa de satisfação', texto: 'Convite e motivo são seus; a nota de 0 a 10 que a cliente responde já classifica ela sozinha na ficha.', automatico: 'avisa' },
      { titulo: 'Pedido de avaliação', texto: 'Só para quem deu nota alta: peça a avaliação no Google (/avaliacao).' },
      { titulo: 'Retomadas', texto: 'Quem não fechou entra em Retomadas, agrupado por demanda, e pode receber conteúdo a cada 45 dias — nunca quem pediu para não receber.' },
    ],
    links: [{ nome: 'Ir para Retomadas', to: '/crm?aba=remarketing' }],
  },
]

