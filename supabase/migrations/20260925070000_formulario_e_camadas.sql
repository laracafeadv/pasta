-- =============================================================================
-- CRM Lara Café — migração 8
-- Formulário da cliente (depois de contratar), arquivos do WhatsApp no Drive,
-- honorários em camadas (Módulo 1 — Precificação) e pós-venda.
-- =============================================================================

-- Link do arquivo no Drive (documentos e fotos recebidos pelo WhatsApp).
alter table public.mensagens_whatsapp add column if not exists drive_url text;

-- Formulário da cliente: link individual com validade, uma resposta, anexos limitados.
alter table public.contatos
  add column if not exists form_token          text unique,
  add column if not exists form_expira         timestamptz,
  add column if not exists form_respondido_em  timestamptz,
  add column if not exists form_arquivos       int not null default 0,
  add column if not exists tem_filhos          boolean;

-- Honorários em camadas: arranque (valor) + mensal por prazo determinado
-- + percentual sobre o proveito econômico + validade do contrato com revisão.
alter table public.honorarios drop constraint if exists honorarios_tipo_check;
alter table public.honorarios add constraint honorarios_tipo_check
  check (tipo in ('Consulta', 'Contrato fixo', 'Em camadas', 'Êxito', 'Assessoria mensal'));
alter table public.honorarios
  add column if not exists valor_mensal      numeric(12, 2),
  add column if not exists meses             int check (meses is null or meses between 1 and 60),
  add column if not exists percentual_exito  numeric(5, 2) check (percentual_exito is null or percentual_exito between 0 and 100),
  add column if not exists validade_anos     int check (validade_anos is null or validade_anos between 1 and 20);

-- Mensagens novas: formulário da cliente, triagem de 20 minutos (Módulo 1 — atividades-chave)
-- e pós-venda (escada de serviços).
insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('5. Proposta e contrato', 'Formulário da cliente', '/formulario', $t$[NOME], agora que vamos cuidar do seu caso, preparei um formulário rápido para entender melhor a sua situação e já reunir os dados da procuração e do contrato:
[LINK DO FORMULÁRIO]
Leva uns 5 minutos, e você pode anexar os documentos por lá mesmo, com segurança. Qualquer dúvida, estou por aqui. 🤍$t$, 50),
('6. Objeções', 'Triagem rápida por ligação (20 min)', '/triagem-20min', $t$[NOME], você tem 20 minutinhos agora? Consigo te ligar, entender melhor o seu caso e já te orientar sobre o melhor caminho.$t$, 5),
('10. Relacionamento', 'Pós-venda — 30 dias depois', '/pos-venda-30', $t$Oi, [NOME]! Tudo bem? Passando para saber se deu tudo certo depois da conclusão do seu caso. Ficou algum passo pendente (por exemplo, [PRÓXIMO PASSO: registrar o pacto nas matrículas, fazer o testamento, atualizar documentos])? Estou à disposição para te ajudar com isso.$t$, 80),
('10. Relacionamento', 'Pós-venda — 1 ano depois', '/pos-venda-1ano', $t$Oi, [NOME]! Faz um ano que concluímos o seu caso e lembrei de você. Como estão as coisas? Se surgir qualquer questão nova na sua família ou no seu patrimônio, conte comigo.$t$, 90)
on conflict (atalho) do nothing;
