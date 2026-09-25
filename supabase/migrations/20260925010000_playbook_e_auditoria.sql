-- =============================================================================
-- CRM Lara Café — migração 2
-- Estratégias dos playbooks "WhatsApp Otimizado" e "Scripts que Vendem"
-- (Desafio Comercial Diamante) + ideias do projeto plataforma-adv
-- (tempo na etapa, checklist de documentos, auditoria imutável).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funil: etapa "Em qualificação" e tempo na etapa
-- -----------------------------------------------------------------------------
alter table public.contatos drop constraint if exists contatos_etapa_check;
alter table public.contatos add constraint contatos_etapa_check
  check (etapa in ('novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta', 'ativo', 'concluido', 'perdido'));

alter table public.contatos
  add column if not exists etapa_desde      timestamptz not null default now(),
  add column if not exists consulta_em      timestamptz,
  add column if not exists data_nascimento  date,
  add column if not exists classificacao    text check (classificacao in ('promotora', 'neutra', 'fria', 'detratora')),
  add column if not exists nps              smallint check (nps between 0 and 10);

update public.contatos set etapa_desde = updated_at where etapa_desde > updated_at;

create or replace function public.marcar_etapa_desde()
returns trigger language plpgsql as $$
begin
  if new.etapa is distinct from old.etapa then
    new.etapa_desde = now();
  end if;
  -- NPS define a classificação automaticamente (a equipe pode ajustar depois).
  if new.nps is distinct from old.nps and new.nps is not null then
    new.classificacao = case when new.nps >= 9 then 'promotora' when new.nps >= 7 then 'neutra' else 'detratora' end;
  end if;
  return new;
end $$;

drop trigger if exists contatos_etapa_desde on public.contatos;
create trigger contatos_etapa_desde before update on public.contatos
  for each row execute function public.marcar_etapa_desde();

-- -----------------------------------------------------------------------------
-- Checklist de documentos por cliente
-- -----------------------------------------------------------------------------
create table if not exists public.documentos (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  contato_id     bigint not null references public.contatos (id) on delete cascade,
  descricao      text not null,
  obrigatorio    boolean not null default true,
  status         text not null default 'pendente' check (status in ('pendente', 'recebido', 'dispensado')),
  observacao     text,
  ordem          int not null default 0,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid references public.profiles (id) on delete set null
);
create index if not exists documentos_contato_idx on public.documentos (contato_id, ordem);
alter table public.documentos enable row level security;
create policy "documentos: equipe" on public.documentos
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Biblioteca de mensagens (respostas rápidas)
-- -----------------------------------------------------------------------------
create table if not exists public.modelos_mensagem (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  categoria   text not null,
  titulo      text not null,
  atalho      text not null unique check (atalho ~ '^/[a-z0-9-]{2,40}$'),
  texto       text not null,
  ordem       int not null default 0,
  ativo       boolean not null default true
);
create trigger modelos_mensagem_updated_at before update on public.modelos_mensagem
  for each row execute function public.set_updated_at();
alter table public.modelos_mensagem enable row level security;
create policy "modelos: equipe" on public.modelos_mensagem
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Auditoria imutável (quem fez o quê, quando). Nem o servidor consegue
-- alterar ou apagar um registro: o gatilho bloqueia UPDATE e DELETE.
-- Guarda só ids e nomes de campos alterados, nunca o conteúdo (LGPD).
-- -----------------------------------------------------------------------------
create table if not exists public.auditoria (
  id            bigint generated always as identity primary key,
  quando        timestamptz not null default now(),
  usuario_id    uuid,
  usuario_nome  text,
  acao          text not null,
  entidade      text,
  entidade_id   text,
  detalhes      jsonb
);
create index if not exists auditoria_quando_idx on public.auditoria (quando desc);

create or replace function public.auditoria_imutavel()
returns trigger language plpgsql as $$
begin
  raise exception 'A auditoria não pode ser alterada nem apagada.';
end $$;
drop trigger if exists auditoria_sem_alteracao on public.auditoria;
create trigger auditoria_sem_alteracao before update or delete on public.auditoria
  for each row execute function public.auditoria_imutavel();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.auditoria enable row level security;
create policy "auditoria: admin lê" on public.auditoria for select using (public.is_admin());
-- Inserção apenas pelo servidor (service role).

-- -----------------------------------------------------------------------------
-- Scripts iniciais (playbook "Scripts que Vendem", adaptados).
-- [NOME] é trocado automaticamente pelo primeiro nome do contato.
-- Os demais [CAMPOS] devem ser completados antes de enviar.
-- -----------------------------------------------------------------------------
insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('1. Primeiras mensagens', 'Boas-vindas', '/boasvindas', $t$Oi, [NOME]! Obrigada por entrar em contato com o escritório Lara Café. Pra eu te ajudar da melhor forma, me conta rapidinho: qual é a sua situação hoje?$t$, 10),
('1. Primeiras mensagens', 'Triagem — Família', '/triagem-familia', $t$Perfeito, [NOME].
Para que eu possa te orientar da melhor forma, vou te pedir algumas informações rápidas:
1. Você é casada(o) ou vive em união estável?
2. Há filhos menores de idade?
3. Já existe processo judicial em andamento?
4. Você busca um acordo ou acredita que será litigioso?
Com isso, consigo direcionar o melhor atendimento pra você.$t$, 20),
('1. Primeiras mensagens', 'Triagem — Sucessões', '/triagem-sucessoes', $t$Sinto muito pela sua perda, [NOME].
Para eu entender como posso te ajudar, me conta:
1. Há quanto tempo aconteceu o falecimento?
2. Quantos herdeiros existem, e estão de acordo entre si?
3. Existem bens como imóveis, veículos ou investimentos?
4. Há testamento ou algum processo já aberto?$t$, 30),
('1. Primeiras mensagens', 'Direcionando pra consulta', '/consulta', $t$Obrigada por compartilhar, [NOME].
Pelo que você relatou, o ideal é agendarmos uma consulta estratégica para que eu analise o seu cenário com calma e te entregue um direcionamento completo e seguro.
Vou te enviar as opções de data e horário agora, tudo bem?$t$, 40),
('1. Primeiras mensagens', 'Caso fora da área (com elegância)', '/fora-da-area', $t$Oi, [NOME]. Tudo bem?
Obrigada por compartilhar sua demanda comigo.
Neste momento, para esse tipo específico de caso, eu não consigo assumir com a técnica que você precisa e merece. O ideal é procurar um(a) profissional especialista em [ÁREA] para ter o suporte mais adequado.
Se precisar de algo em Família, Sucessões ou Planejamento Matrimonial, estou à disposição!$t$, 50),

('2. Agendamento', 'Procedimento de agendamento e cobrança', '/agendamento', $t$Vou te enviar algumas orientações sobre o agendamento da consulta — qualquer dúvida, estou por aqui:
• O valor da consulta é de R$ [VALOR], abatido dos honorários em caso de fechamento de contrato.
• O atendimento é por videochamada (via [PLATAFORMA]).
• O horário fica confirmado com o comprovante do pagamento via PIX.
Você tem preferência pela manhã ou pela tarde?$t$, 10),
('2. Agendamento', 'Opções de agenda', '/opcoes', $t$Perfeito, [NOME].
Seguem as opções disponíveis para sua consulta:
📍 [DATA] às [HORA]
📍 [DATA] às [HORA]
📍 [DATA] às [HORA]
Qual delas fica melhor pra você?$t$, 20),
('2. Agendamento', 'Agendamento realizado', '/agendado', $t$Agendamento feito, [NOME]! ✅
Sua consulta ficou marcada para:
🗓 Data: [DATA]
🕐 Horário: [HORA]
📍 Formato: videochamada
📌 Link: [LINK]
Caso surja algum imprevisto, pedimos aviso com 24h de antecedência para reagendar.
Abaixo envio o PIX para reserva do horário, combinado?$t$, 30),
('2. Agendamento', 'Lembrete no dia anterior', '/lembrete', $t$Oi, [NOME]! Passando pra lembrar que sua consulta é amanhã:
🗓 Data: [DATA]
🕐 Horário: [HORA]
📌 Link: [LINK]
Podemos confirmar sua presença? 😊$t$, 40),
('2. Agendamento', 'Orientações no dia da consulta', '/regras-consulta', $t$Olá, [NOME]! 😊
Para garantir um atendimento de excelência, seguem algumas orientações:
☑ A consulta tem duração média de [X] minutos;
☑ A plataforma é [PLATAFORMA]. Se precisar de ajuda com o acesso, me avise que te auxilio antes.
Qualquer dúvida, estou à disposição!$t$, 50),

('3. Depois da consulta', 'Pós-consulta', '/pos-consulta', $t$Oi, [NOME]! Tudo bem? 😊
Agradeço a confiança! Foi um prazer te atender hoje.
Já analisei seu caso e, a partir de agora, vamos organizar os próximos passos para que você siga com segurança e clareza.
Qualquer dúvida adicional, pode me chamar por aqui.$t$, 10),
('3. Depois da consulta', 'Resumo e próximos passos', '/resumo', $t$Oi, [NOME]! 😊
Conforme alinhado na consulta, segue o resumo e os próximos passos:
[RESUMO DO CASO]
📌 1) [PASSO 1]
📌 2) [PASSO 2]
📌 3) [PASSO 3]
Independentemente do fechamento do contrato, é importante que você já reúna esses documentos. Vou te enviar a proposta de honorários ainda hoje.$t$, 20),

('4. Documentos', 'Checklist inicial', '/documentos', $t$Segue o checklist inicial de documentos pra darmos andamento:
[LISTA DE DOCUMENTOS]
Pode me enviar por aqui mesmo, em PDF ou foto legível. Se preferir, te mando um link para enviar por lá. O que prefere?$t$, 10),
('4. Documentos', 'Confirmando recebimento', '/recebidos', $t$Perfeito, [NOME]! ✅
Recebi os documentos e já estou organizando tudo. Se faltar algum item, eu te aviso. Obrigada pela agilidade 😊$t$, 20),
('4. Documentos', 'Cobrança de documento pendente', '/pendencia', $t$Oi, [NOME]! Já recebi:
[RECEBIDOS]
Passando pra lembrar do envio de:
[PENDENTES]
Eles são importantes pra avançarmos. Qual prazo fica confortável pra você me enviar?$t$, 30),

('5. Proposta e contrato', 'Envio da proposta', '/proposta', $t$Oi, [NOME]! Tudo bem? 😊
Conforme conversamos, segue a proposta de honorários e a explicação do serviço que vou prestar.
Se desejar, posso esclarecer qualquer ponto por aqui.$t$, 10),
('5. Proposta e contrato', 'Explicando o valor', '/valor', $t$A proposta contempla não apenas a atuação jurídica, mas toda a condução estratégica do seu caso: acompanhamento, organização documental, elaboração de peças, relatórios, reuniões necessárias e suporte durante todo o processo.
Meu foco é que você se sinta segura e amparada do início ao fim.$t$, 20),
('5. Proposta e contrato', 'Envio do contrato', '/contrato', $t$Oi, [NOME]! 😊
Segue o contrato de prestação de serviços, já com as condições que conversamos.
Dá uma lida com calma e, se tiver dúvida sobre alguma cláusula, me chama que explico ponto a ponto. Assim que assinar, me avisa que já sigo com os próximos passos.$t$, 30),
('5. Proposta e contrato', 'Contrato assinado + boas-vindas', '/boas-vindas-cliente', $t$Recebido, [NOME]! Contrato assinado com sucesso ✅
A partir de agora seu caso está oficialmente sob minha responsabilidade — conduzido com estratégia, dedicação e responsabilidade.
Meu próximo passo é organizar a documentação e estruturar a linha de atuação. Já te mando o checklist do que preciso pra iniciar, tudo bem?$t$, 40),
('5. Proposta e contrato', 'Como funciona a comunicação', '/comunicacao', $t$Só alinhando nosso fluxo:
📍 Você pode me enviar dúvidas e informações por aqui (WhatsApp).
📍 Respondo em horário comercial.
📍 Atualizações importantes eu sempre vou te avisar.
Meu objetivo é te manter segura e informada durante todo o processo.$t$, 50),

('6. Objeções', 'Consulta é paga?', '/obj-consulta-paga', $t$Sim, [NOME] 😊 A consulta é um atendimento estratégico: analiso seu cenário com profundidade, esclareço riscos e as possibilidades reais do seu caso — o que evita decisões precipitadas. O valor é abatido dos honorários em caso de fechamento. Posso te enviar as opções de horário?$t$, 10),
('6. Objeções', 'Achei caro pagar consulta', '/obj-caro-consulta', $t$Entendo, [NOME]. A consulta não é só uma conversa: é um diagnóstico estratégico com orientação prática. Uma decisão tomada sem orientação pode gerar prejuízos maiores do que o valor da consulta (que é abatido em caso de fechamento). Posso te enviar as datas disponíveis?$t$, 20),
('6. Objeções', 'Vou pensar e depois marco', '/obj-pensar-consulta', $t$Claro, [NOME] 😊 Só reforçando: quanto antes você tiver clareza do cenário, mais segura será sua decisão. Quando quiser, te envio as opções de horário — é só me avisar.$t$, 30),
('6. Objeções', 'Não tenho dinheiro agora', '/obj-sem-dinheiro', $t$Eu entendo, [NOME]. Se fizer sentido, podemos ver a possibilidade de parcelar a consulta, assim você já recebe o direcionamento necessário sem adiar uma decisão importante. Quer que eu te passe as opções?$t$, 40),
('6. Objeções', 'Vou pensar (contrato)', '/obj-pensar-contrato', $t$Claro, [NOME] 😊 É uma decisão importante mesmo. Só reforçando: se você quiser seguir, o ideal é não demorar muito, porque o tempo pode impactar provas, acordos e decisões futuras. Qualquer dúvida sobre a proposta, posso esclarecer por aqui.$t$, 50),
('6. Objeções', 'Achei caro (honorários)', '/obj-caro', $t$Entendo, [NOME]. O investimento está ligado ao nível de estratégia, responsabilidade e condução que o seu caso exige — são decisões que impactam a vida inteira. Posso detalhar o que está incluso, pra você comparar com segurança?$t$, 60),
('6. Objeções', 'Você garante que eu ganho?', '/obj-garantia', $t$Dúvida muito comum, [NOME]. Vou ser totalmente transparente: no Direito, nenhum profissional sério pode garantir resultado, porque dependemos de decisões judiciais e de provas. Minha obrigação é de meio, não de resultado. O que eu garanto é estratégia, excelência técnica e condução firme — e isso faz toda a diferença.$t$, 70),
('6. Objeções', 'Vou falar com a família', '/obj-familia', $t$Claro, [NOME]. É importante que você se sinta segura. Posso te enviar um resumo objetivo do que está incluso no serviço e dos próximos passos, pra facilitar essa conversa?$t$, 80),
('6. Objeções', 'Tem desconto?', '/obj-desconto', $t$Oi, [NOME]! 😊 A proposta foi estruturada com base na complexidade do caso e no acompanhamento necessário. O que posso avaliar é ajustar a forma de pagamento ou o parcelamento pra facilitar pra você: [NOVA CONDIÇÃO]. Assim fica melhor?$t$, 90),

('7. Follow-up', 'Follow-up 24h depois da proposta', '/followup-24h', $t$Oi, [NOME]! Tudo bem? 😊
Enviei a proposta ontem, mas talvez você ainda não tenha conseguido analisar…
Se surgir qualquer dúvida sobre a proposta ou sobre o serviço, pode me perguntar!$t$, 10),
('7. Follow-up', 'Follow-up 7 dias', '/followup-7d', $t$Olá, [NOME]! Tudo bem?
Sobre nossa conversa da semana passada, fiquei pensando em [SITUAÇÃO IMPORTANTE]. Como está a situação?
Passando pra saber se você gostaria de seguir, já que [RISCO DE ADIAR]. Me avise se podemos seguir, assim consigo priorizar seu caso.$t$, 20),
('7. Follow-up', 'Follow-up final (14 dias)', '/followup-final', $t$Oi, [NOME]! 😊
Como não tivemos retorno, vou encerrar o acompanhamento por aqui pra não te incomodar.
Se em algum momento você decidir avançar, ou precisar de orientação, pode me chamar. Será um prazer te atender!$t$, 30),

('8. Financeiro', 'Pagamento confirmado', '/pagamento-ok', $t$Oi, [NOME]! 😊
Recebi o comprovante! Pagamento confirmado com sucesso ✅
A partir de agora sigo com os próximos passos do seu caso. Qualquer dúvida, continuo à disposição!$t$, 10),
('8. Financeiro', 'Lembrete de vencimento', '/vencimento', $t$Oi, [NOME]! Tudo bem? 😊
Passando pra lembrar que o vencimento da parcela de [MÊS] é em [DATA].
Se precisar de segunda via ou tiver qualquer dúvida, me chama por aqui.$t$, 20),
('8. Financeiro', 'Parcela em aberto', '/inadimplencia', $t$Oi, [NOME]. Tudo bem? 😊
Identifiquei que o pagamento da parcela [X/X], no valor de R$ [VALOR], com vencimento em [DATA], ainda não foi realizado.
Entendo que imprevistos acontecem. Se já tiver pago, me envia o comprovante pra eu dar baixa; se não, te reenvio o boleto agora.$t$, 30),

('9. Avaliação e NPS', 'Pedido de avaliação no Google', '/avaliacao', $t$[NOME], quero te agradecer pela confiança e dizer que fico muito feliz por termos chegado até aqui.
Se você se sentiu bem atendida durante esse processo, te peço um favor: deixar uma avaliação sobre o meu trabalho no Google. É rápido e ajuda outras pessoas em situações difíceis a me encontrarem.
📌 [LINK GOOGLE]$t$, 10),
('9. Avaliação e NPS', 'Pesquisa NPS', '/nps', $t$Oi, [NOME]! 😊 Estou sempre buscando melhorar meu atendimento, e sua opinião é muito valiosa.
De 0 a 10, quanto você me indicaria para alguém que precisa de uma advogada da minha área? E por que essa nota?$t$, 20),
('9. Avaliação e NPS', 'Resposta a nota 9–10', '/nps-promotora', $t$Que alegria, [NOME]! 🤍 Muito obrigada pela confiança e por essa nota. É uma honra te acompanhar e cuidar do seu caso com responsabilidade. Conte comigo sempre!$t$, 30),
('9. Avaliação e NPS', 'Resposta a nota 7–8', '/nps-neutra', $t$Oi, [NOME]. Obrigada por responder! Quero evoluir sempre. Se puder me contar, de forma breve, o que eu poderia melhorar, vou ficar muito grata.$t$, 40),
('9. Avaliação e NPS', 'Resposta a nota 0–6', '/nps-detratora', $t$Oi, [NOME]. Obrigada por compartilhar sua percepção. Sinto muito se sua experiência não atendeu às expectativas. Gostaria de entender melhor o que aconteceu, pra corrigir qualquer falha — se puder me explicar, entro em contato pra resolver com prioridade.$t$, 50),

('10. Relacionamento', 'Aniversário', '/aniversario', $t$[NOME], hoje é um dia especial e eu não poderia deixar de registrar meus votos de saúde, prosperidade e muitas conquistas. [ALGO PESSOAL] Que esse novo ano seja repleto de realizações. Conte sempre comigo!$t$, 10),
('10. Relacionamento', 'Natal', '/natal', $t$[NOME], desejo a você e sua família um Natal repleto de paz, união e momentos especiais. Que o próximo ano seja de novas oportunidades. Agradeço a confiança no meu trabalho!$t$, 20)
on conflict (atalho) do nothing;
