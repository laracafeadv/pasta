-- =============================================================================
-- CRM Lara Café — migração 7
-- Mensagens do escritório (antigo quadro "Mensagens de WhatsApp"): disponibilidade,
-- orientação de consulta, cobrança de parcela e envio de boleto.
-- Campos entre colchetes são preenchidos pelo CRM (dados do escritório e da parcela).
-- =============================================================================
insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('2. Agendamento', 'Disponibilidade da Dra.', '/disponibilidade', $t$[NOME], a [DRA] tem disponibilidade para atendimento no dia [DATA] às [HORA]. Esse horário te atende?$t$, 5),
('2. Agendamento', 'Orientação de consulta', '/orientacao-consulta', $t$Perfeito, vamos dar seguimento então.
Vou te enviar agora algumas orientações sobre o nosso procedimento para agendamento de consultas e, caso ainda reste alguma dúvida, estou por aqui à disposição!

O valor da consulta importa em [VALOR DA CONSULTA] ([VALOR POR EXTENSO]), que será abatido em caso de fechamento de contrato.

O atendimento é por videoconferência, via [PLATAFORMA], ou presencial, com duração de até [DURAÇÃO].

O horário agendado somente estará confirmado e reservado com a comprovação do pagamento, que poderá ser feito via PIX ([PIX]) ou depósito na conta [DADOS BANCÁRIOS].

Após o pagamento e a confirmação do agendamento, enviaremos o link de acesso à reunião ou o endereço do escritório, caso a consulta seja presencial.$t$, 6),
('8. Financeiro', 'Cobrança de parcela', '/cobranca', $t$[SAUDAÇÃO], [NOME]! Tudo bem?

Fazendo o balanço do escritório, identificamos que, até o momento, o pagamento da parcela [PARCELA], no valor de [VALOR DA PARCELA], com vencimento em [VENCIMENTO], ainda não foi compensado.

Entendemos que imprevistos acontecem e, por isso, nos encontramos à disposição para ajudar no que for preciso.

Caso já tenha efetuado o pagamento, poderia, por gentileza, nos encaminhar o comprovante? Será importante para a baixa e o controle financeiro.

Se ainda não tiver efetuado o pagamento, segue o boleto para facilitar.

Atenciosamente, equipe Lara Café$t$, 25),
('8. Financeiro', 'Envio de boleto da parcela', '/boleto', $t$[SAUDAÇÃO], [NOME]! Tudo bem?
Segue anexo o boleto referente à parcela [PARCELA], com vencimento em [VENCIMENTO], relativo ao contrato de honorários de prestação de serviços advocatícios.

Caso tenha algum problema com o acesso ao boleto, basta nos sinalizar por aqui, estamos à disposição! Tenha um ótimo dia!$t$, 15),
('3. Depois da consulta', 'Feedback da consulta', '/feedback', $t$[SAUDAÇÃO], [NOME]! Tudo bem? 🌻
Me chamo [MEU NOME], faço parte da equipe do escritório da [DRA] e estou entrando em contato para pedir um feedback sobre suas percepções acerca da consulta realizada ontem com a [DRA], e saber se surgiu alguma dúvida sobre os assuntos tratados que queira esclarecer.

Fico à disposição, e até amanhã enviaremos a proposta de honorários!$t$, 5),
('7. Follow-up', 'Remarketing — proposta sem resposta', '/remarketing-proposta', $t$[SAUDAÇÃO], [NOME]! Tudo bem?
Me chamo [MEU NOME], faço parte da equipe do escritório e estou passando para perguntar como está a situação [DESENVOLVER PARA O CASO ESPECÍFICO] e se restou alguma dúvida que gostaria de esclarecer sobre o caso.

Gostaríamos também de confirmar se você recebeu a proposta de honorários enviada no dia [DATA DA PROPOSTA]. Caso não tenha recebido, podemos enviar novamente.

Entramos em contato porque nos preocupamos com a sua demanda e sabemos da importância que ela tem para você. Estamos à disposição para iniciarmos os trabalhos necessários. Tenha uma ótima semana!$t$, 45)
on conflict (atalho) do nothing;

-- NPS em conversa (três mensagens, uma de cada vez, esperando a resposta).
insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('9. Avaliação e NPS', 'NPS 1 — pedir a avaliação', '/nps-convite', $t$Olá, [NOME], tudo bem?
Pensando em sempre aprimorar o nosso serviço e a qualidade do nosso atendimento, gostaríamos que você avaliasse o nosso desempenho. Seria possível?$t$, 11),
('9. Avaliação e NPS', 'NPS 2 — pedir a nota', '/nps-nota', $t$Agradecemos muito! Inicialmente, gostaríamos de saber: de 0 a 10, qual nota você daria para a execução do trabalho e o nível de satisfação com o escritório?$t$, 12),
('9. Avaliação e NPS', 'NPS 3 — pedir o motivo', '/nps-motivo', $t$Perfeito! Poderia nos explicar, brevemente, por que atribuiu essa nota?$t$, 13)
on conflict (atalho) do nothing;

-- As versões do playbook que cobrem a mesma situação ficam desativadas (não apagadas).
update public.modelos_mensagem set ativo = false where atalho in ('/agendamento', '/inadimplencia', '/nps');
