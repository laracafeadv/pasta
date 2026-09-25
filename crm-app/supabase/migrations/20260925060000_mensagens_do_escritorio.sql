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

O valor da consulta importa em [VALOR DA CONSULTA], que será abatido em caso de fechamento de contrato.

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

Caso tenha algum problema com o acesso ao boleto, basta nos chamar por aqui.

Atenciosamente, equipe Lara Café$t$, 15)
on conflict (atalho) do nothing;

-- As versões do playbook que cobrem a mesma situação ficam desativadas (não apagadas).
update public.modelos_mensagem set ativo = false where atalho in ('/agendamento', '/inadimplencia');
