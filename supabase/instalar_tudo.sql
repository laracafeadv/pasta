-- CRM Lara Café — instalação completa (todas as migrações, em ordem).
-- Cole tudo no SQL Editor do Supabase e clique em Run. Rode uma vez só, num banco vazio.

-- ===== supabase/migrations/20260925000000_schema_inicial.sql =====
-- =============================================================================
-- CRM Lara Café Advocacia — schema inicial
-- Execute no SQL Editor do Supabase (ou via `supabase db push`).
-- =============================================================================

create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Perfis de usuário
--   admin  → Lara (tudo, inclusive usuários e configuração da IA)
--   equipe → secretária / estagiária (CRM, honorários, conversas)
--   user   → cadastrado sem acesso (aguardando liberação de um admin)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  name        text not null default '',
  role        text not null default 'user' check (role in ('admin', 'equipe', 'user')),
  phone       text,
  company     text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Verdadeiro quando o usuário logado pertence ao escritório.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'equipe')
  );
$$;

alter table public.profiles enable row level security;

create policy "perfil: ler o próprio ou, se equipe, todos" on public.profiles
  for select using (id = auth.uid() or public.is_staff());

-- Alterações de perfil passam pela API do servidor (service role).

-- -----------------------------------------------------------------------------
-- Contatos (leads e clientes)
-- -----------------------------------------------------------------------------
create table if not exists public.contatos (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  telefone            text not null unique,            -- só dígitos, com DDI (ex.: 5511999998888)
  nome                text,
  email               text,
  cidade              text,
  origem              text,                            -- WhatsApp, Formulário do site, Instagram, Indicação…

  area                text,                            -- Direito de Família, Sucessões, Planejamento Matrimonial, Consultoria Jurídica
  demanda             text,                            -- Divórcio, Inventário, Pacto antenupcial…
  parte_contraria     text,                            -- usado na checagem de conflito de interesses
  resumo              text,                            -- resumo do caso (IA ou equipe)
  sentimento          text check (sentimento in ('Positivo', 'Neutro', 'Negativo')),
  urgencia            text check (urgencia in ('Alta', 'Média', 'Baixa')),
  interesses          text[] not null default '{}',   -- pontos de atenção do caso
  objecoes            text[] not null default '{}',   -- dúvidas / resistências à contratação

  etapa               text not null default 'novo'
                      check (etapa in ('novo', 'agendado', 'diagnostico', 'proposta', 'ativo', 'concluido', 'perdido')),
  motivo_perda        text,
  proxima_acao        text,
  proxima_data        date,
  responsavel_id      uuid references public.profiles (id) on delete set null,

  ia_ativa            boolean not null default true,  -- false = equipe assumiu a conversa
  consentimento_em    timestamptz,                     -- aviso LGPD enviado/aceito
  ultima_mensagem_em  timestamptz
);

create index if not exists contatos_etapa_idx on public.contatos (etapa);
create index if not exists contatos_proxima_data_idx on public.contatos (proxima_data);
create index if not exists contatos_created_at_idx on public.contatos (created_at desc);

create trigger contatos_updated_at before update on public.contatos
  for each row execute function public.set_updated_at();

alter table public.contatos enable row level security;
create policy "contatos: equipe" on public.contatos
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Honorários (substitui o módulo de "vendas")
-- -----------------------------------------------------------------------------
create table if not exists public.honorarios (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  contato_id        bigint not null references public.contatos (id) on delete cascade,
  descricao         text,
  valor             numeric(12, 2) not null default 0,
  tipo              text not null default 'Contrato fixo'
                    check (tipo in ('Consulta', 'Contrato fixo', 'Êxito', 'Assessoria mensal')),
  status            text not null default 'Proposta'
                    check (status in ('Proposta', 'Contratado', 'Pago', 'Cancelado')),
  forma_pagamento   text,
  parcelas          int not null default 1 check (parcelas >= 1),
  data_contratacao  date,
  responsavel_id    uuid references public.profiles (id) on delete set null,
  observacao        text
);

create index if not exists honorarios_contato_idx on public.honorarios (contato_id);
create index if not exists honorarios_created_at_idx on public.honorarios (created_at desc);

create trigger honorarios_updated_at before update on public.honorarios
  for each row execute function public.set_updated_at();

alter table public.honorarios enable row level security;
create policy "honorarios: equipe" on public.honorarios
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Mensagens de WhatsApp
-- -----------------------------------------------------------------------------
create table if not exists public.mensagens_whatsapp (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  contato_id      bigint not null references public.contatos (id) on delete cascade,
  direcao         text not null check (direcao in ('entrada', 'saida')),
  autor           text not null check (autor in ('cliente', 'ia', 'equipe')),
  autor_id        uuid references public.profiles (id) on delete set null,
  conteudo        text not null,
  tipo            text not null default 'texto',
  wa_message_id   text unique
);

create index if not exists mensagens_contato_idx on public.mensagens_whatsapp (contato_id, created_at desc);

alter table public.mensagens_whatsapp enable row level security;
create policy "mensagens: equipe" on public.mensagens_whatsapp
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Atividades do contato (anotações, andamentos, mudanças de etapa)
-- -----------------------------------------------------------------------------
create table if not exists public.atividades (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  contato_id  bigint not null references public.contatos (id) on delete cascade,
  autor_id    uuid references public.profiles (id) on delete set null,
  tipo        text not null default 'Anotação',   -- Anotação, Ligação, Reunião, Andamento, Sistema…
  texto       text not null
);

create index if not exists atividades_contato_idx on public.atividades (contato_id, created_at desc);

alter table public.atividades enable row level security;
create policy "atividades: equipe" on public.atividades
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Notificações internas
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  message     text not null,
  type        text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  is_read     boolean not null default false,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
create policy "notificacoes: dono" on public.notifications
  for select using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Assistente de IA: prompt versionado + base de conhecimento (RAG)
-- -----------------------------------------------------------------------------
create table if not exists public.eva_system_prompt (
  id          bigint generated always as identity primary key,
  agent_name  text not null unique,
  content     text not null,
  version     int not null default 1,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

create table if not exists public.eva_prompt_history (
  history_id  bigint generated always as identity primary key,
  prompt_id   bigint references public.eva_system_prompt (id) on delete cascade,
  agent_name  text not null,
  content     text not null,
  version     int not null,
  updated_at  timestamptz not null,
  updated_by  uuid references public.profiles (id) on delete set null
);

create table if not exists public.informacoes_adicional_rag (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  content     text not null,
  source      text,
  tipo        text
);

create table if not exists public.documents (
  id         bigserial primary key,
  content    text,
  metadata   jsonb,
  embedding  vector(1536)
);

create or replace function public.match_documents (
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'
) returns table (id bigint, content text, metadata jsonb, similarity float)
language sql stable as $$
  select d.id, d.content, d.metadata, 1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  where d.metadata @> filter
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

alter table public.eva_system_prompt enable row level security;
alter table public.eva_prompt_history enable row level security;
alter table public.informacoes_adicional_rag enable row level security;
alter table public.documents enable row level security;

create policy "prompt: equipe lê" on public.eva_system_prompt for select using (public.is_staff());
create policy "historico prompt: equipe lê" on public.eva_prompt_history for select using (public.is_staff());
-- informacoes_adicional_rag e documents: somente service role (servidor).

-- -----------------------------------------------------------------------------
-- Storage: avatares dos usuários (substitui o Dropbox)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ===== supabase/migrations/20260925010000_playbook_e_auditoria.sql =====
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

-- ===== supabase/migrations/20260925020000_cliente_caso_agenda.sql =====
-- =============================================================================
-- CRM Lara Café — migração 3
-- Mídia do WhatsApp (áudio, imagem, documento), dados do escritório,
-- qualificação do cliente (dados confidenciais), casos e agenda/prazos.
-- Inspirado no projeto plataforma-adv (clientes, dossiê, máscara de dados).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Mídia recebida no WhatsApp
-- -----------------------------------------------------------------------------
alter table public.mensagens_whatsapp
  add column if not exists midia_path  text,   -- caminho no bucket privado "whatsapp"
  add column if not exists midia_tipo  text,   -- mime type
  add column if not exists midia_nome  text,   -- nome original (documentos)
  add column if not exists transcricao text;   -- texto do áudio (transcrição automática)

-- Bucket PRIVADO: arquivos de clientes só são acessados por link temporário gerado pelo servidor.
insert into storage.buckets (id, name, public)
values ('whatsapp', 'whatsapp', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Dados do escritório (usados pela Ana e nas peças)
-- -----------------------------------------------------------------------------
create table if not exists public.escritorio (
  chave       text primary key,
  valor       text not null default '',
  updated_at  timestamptz not null default now()
);
alter table public.escritorio enable row level security;
create policy "escritorio: equipe lê" on public.escritorio for select using (public.is_staff());
-- Escrita somente pelo servidor (admin).

-- -----------------------------------------------------------------------------
-- Qualificação do cliente (dados confidenciais).
-- A equipe vê CPF/RG mascarados; só a administração vê completo (regra no servidor).
-- -----------------------------------------------------------------------------
create table if not exists public.qualificacao (
  contato_id      bigint primary key references public.contatos (id) on delete cascade,
  nome_completo   text,
  cpf             text,
  rg              text,
  orgao_emissor   text,
  nacionalidade   text default 'brasileira',
  estado_civil    text,
  profissao       text,
  endereco        text,
  bairro          text,
  cep             text,
  cidade          text,
  uf              text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null
);
alter table public.qualificacao enable row level security;
-- Sem políticas: acesso só pelo servidor (service role), que aplica a máscara.

-- -----------------------------------------------------------------------------
-- Casos (dossiê)
-- -----------------------------------------------------------------------------
create table if not exists public.casos (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  contato_id       bigint not null references public.contatos (id) on delete cascade,
  titulo           text not null,
  area             text,
  tipo             text not null default 'judicial' check (tipo in ('judicial', 'extrajudicial', 'consultivo')),
  numero_processo  text,
  orgao            text,           -- vara / cartório
  comarca          text,
  uf               text,
  parte_contraria  text,
  status           text not null default 'ativo' check (status in ('ativo', 'suspenso', 'encerrado')),
  data_abertura    date not null default current_date,
  data_encerramento date,
  observacoes      text,
  responsavel_id   uuid references public.profiles (id) on delete set null
);
create index if not exists casos_contato_idx on public.casos (contato_id);
create unique index if not exists casos_processo_idx on public.casos (numero_processo) where numero_processo is not null and numero_processo <> '';
create trigger casos_updated_at before update on public.casos
  for each row execute function public.set_updated_at();
alter table public.casos enable row level security;
create policy "casos: equipe" on public.casos
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Agenda e prazos
-- -----------------------------------------------------------------------------
create table if not exists public.compromissos (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  tipo            text not null default 'tarefa' check (tipo in ('prazo', 'audiencia', 'reuniao', 'consulta', 'tarefa')),
  titulo          text not null,
  contato_id      bigint references public.contatos (id) on delete cascade,
  caso_id         bigint references public.casos (id) on delete cascade,
  inicio          timestamptz,      -- audiência, reunião, consulta
  data_limite     date,             -- prazo processual / tarefa
  data_publicacao date,             -- base do cálculo do prazo
  dias_prazo      int,
  local           text,             -- endereço ou link
  status          text not null default 'pendente' check (status in ('pendente', 'concluido', 'cancelado')),
  observacao      text,
  responsavel_id  uuid references public.profiles (id) on delete set null,
  concluido_em    timestamptz,
  check (inicio is not null or data_limite is not null)
);
create index if not exists compromissos_data_idx on public.compromissos (status, data_limite, inicio);
create trigger compromissos_updated_at before update on public.compromissos
  for each row execute function public.set_updated_at();
alter table public.compromissos enable row level security;
create policy "compromissos: equipe" on public.compromissos
  for all using (public.is_staff()) with check (public.is_staff());

-- A cliente pode mandar áudio: a Ana entende (transcrição) e a equipe ouve no CRM.
update public.modelos_mensagem
   set texto = texto || E'\nSe preferir, pode me mandar um áudio!'
 where atalho in ('/triagem-familia', '/triagem-sucessoes', '/boasvindas')
   and texto not like '%mandar um áudio%';

-- ===== supabase/migrations/20260925030000_gestao_do_escritorio.sql =====
-- =============================================================================
-- CRM Lara Café — migração 4
-- Carteira por classificação (playbook "Classificando seus clientes"),
-- diagnóstico com 5 porquês e viabilidade, Mapa da Empatia (vozes reais),
-- financeiro e qualidade (revisão semanal).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Relacionamento e voz da cliente
-- -----------------------------------------------------------------------------
alter table public.contatos
  add column if not exists classificacao_desde timestamptz,
  add column if not exists ultimo_contato_em   timestamptz,  -- último gesto/contato registrado pela equipe
  add column if not exists obs_relacionamento  text,         -- "observação rápida" da planilha de carteira
  add column if not exists dor                 text,         -- nas palavras da cliente (a Ana registra)
  add column if not exists objetivo            text;         -- o que ela quer que mude (a Ana registra)

update public.contatos set classificacao_desde = updated_at where classificacao is not null and classificacao_desde is null;

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
  -- Guarda desde quando está no grupo: decide "reparar" x "blindar" nas detratoras.
  if new.classificacao is distinct from old.classificacao then
    new.classificacao_desde = case when new.classificacao is null then null else now() end;
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Diagnóstico da consulta: 5 porquês, viabilidade jurídica e financeira
-- -----------------------------------------------------------------------------
create table if not exists public.diagnosticos (
  contato_id            bigint primary key references public.contatos (id) on delete cascade,
  problema_relatado     text,
  porques               jsonb not null default '[]',   -- até 5 respostas, em ordem
  causa_raiz            text,
  objetivo_cliente      text,
  verificacoes          jsonb not null default '{}',   -- { prescricao: true, competencia: false, ... }
  riscos                text,
  capacidade_pagamento  text check (capacidade_pagamento in ('confortavel', 'parcelado', 'restrita', 'nao_informado')),
  valor_em_jogo         numeric(14, 2),
  descricao_em_jogo     text,                          -- ex.: "meação do apartamento", "pensão de 12 meses"
  decisao               text check (decisao in ('viavel', 'ressalvas', 'inviavel')),
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.profiles (id) on delete set null
);
alter table public.diagnosticos enable row level security;
create policy "diagnosticos: equipe" on public.diagnosticos
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Tempo gasto por atividade (rentabilidade)
-- -----------------------------------------------------------------------------
alter table public.atividades add column if not exists minutos int check (minutos is null or minutos between 0 and 1440);

-- -----------------------------------------------------------------------------
-- Casos: resultado (taxa de êxito) — data_encerramento já existe
-- -----------------------------------------------------------------------------
alter table public.casos add column if not exists resultado text
  check (resultado in ('exito', 'parcial', 'acordo', 'sem_exito', 'desistencia'));

-- Lembrete automático de prazo: dia em que a equipe foi avisada (evita repetir).
alter table public.compromissos add column if not exists lembrete_em date;

-- -----------------------------------------------------------------------------
-- Financeiro: contas a receber e a pagar (somente administração)
-- -----------------------------------------------------------------------------
create table if not exists public.lancamentos (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  tipo          text not null check (tipo in ('receber', 'pagar')),
  descricao     text not null,
  categoria     text not null default 'Outros',
  valor         numeric(12, 2) not null check (valor > 0),
  vencimento    date not null,
  pago_em       date,
  recorrente    boolean not null default false,       -- despesa fixa mensal (entra no custo operacional)
  contato_id    bigint references public.contatos (id) on delete set null,
  caso_id       bigint references public.casos (id) on delete set null,
  honorario_id  bigint references public.honorarios (id) on delete cascade,
  observacao    text
);
create index if not exists lancamentos_venc_idx on public.lancamentos (vencimento);
create index if not exists lancamentos_caso_idx on public.lancamentos (caso_id);
create trigger lancamentos_updated_at before update on public.lancamentos
  for each row execute function public.set_updated_at();
alter table public.lancamentos enable row level security;
create policy "lancamentos: admin" on public.lancamentos
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Qualidade: revisão interna por amostragem
-- -----------------------------------------------------------------------------
create table if not exists public.revisoes (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  caso_id         bigint not null references public.casos (id) on delete cascade,
  revisor_id      uuid references public.profiles (id) on delete set null,
  itens           jsonb not null default '{}',        -- { prazos: 'ok' | 'falha' | 'na', ... }
  aprovado        boolean not null,
  observacao      text,
  plano_acao      text,
  compromisso_id  bigint references public.compromissos (id) on delete set null
);
create index if not exists revisoes_caso_idx on public.revisoes (caso_id, created_at desc);
alter table public.revisoes enable row level security;
create policy "revisoes: equipe" on public.revisoes
  for all using (public.is_staff()) with check (public.is_staff());


-- -----------------------------------------------------------------------------
-- Novos scripts: plano de ação por classificação, triagem x consulta, ancoragem
-- -----------------------------------------------------------------------------
insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('10. Relacionamento', 'Neutra — "lembrei de você" (sem pedir nada)', '/reconexao', $t$Oi, [NOME]! Tudo bem por aí? Lembrei de você hoje, [ALGO ESPECÍFICO DO SEU CASO OU DA NOSSA CONVERSA]. Espero que esteja tudo em paz. Um abraço!$t$, 30),
('10. Relacionamento', 'Neutra — conteúdo só para clientes', '/bastidor', $t$Oi, [NOME]! Preparei um material que estou enviando só para clientes do escritório: [TEMA]. Achei que poderia ser útil pra você. Qualquer dúvida, é só me chamar.$t$, 40),
('10. Relacionamento', 'Fria — retomar contato humano', '/reaquecer', $t$Oi, [NOME], quanto tempo! Passando só pra saber como você está depois de tudo o que resolvemos. Fico feliz em acompanhar sua história. Um abraço!$t$, 50),
('10. Relacionamento', 'Promotora — reconhecimento (sem pedido)', '/reconhecimento', $t$[NOME], queria te agradecer de verdade pela confiança de sempre. Clientes como você fazem o meu trabalho ter ainda mais sentido. Conte comigo, viu? 🤍$t$, 60),
('10. Relacionamento', 'Detratora recente — reparar', '/reparacao', $t$Oi, [NOME]. Estive pensando na sua experiência com o escritório e quero reconhecer que [O QUE ACONTECEU]. Você tem razão em se sentir assim. O que vou fazer: [AÇÃO CONCRETA]. Posso te ligar para conversarmos?$t$, 70),
('1. Primeiras mensagens', 'Aprofundar (por quê?)', '/porque', $t$Entendi, [NOME]. E o que te fez decidir procurar ajuda justamente agora?$t$, 60),
('1. Primeiras mensagens', 'Triagem gratuita x consulta', '/triagem-x-consulta', $t$[NOME], só pra ficar claro como funciona: esta conversa inicial é gratuita e serve para eu entender a sua situação e ver se o escritório pode te ajudar. A análise do seu caso — direitos, riscos, caminhos e estratégia — é feita pela Dra. Lara na consulta estratégica, com tempo e sigilo. Assim você decide com segurança, sem achismo.$t$, 70),
('5. Proposta e contrato', 'Proposta com o que está em jogo', '/proposta-valor', $t$[NOME], pra você visualizar: o que está em jogo no seu caso é [O QUE ESTÁ EM JOGO — ex.: a sua parte do apartamento, cerca de R$ X]. O investimento na condução completa é de R$ [VALOR], [FORMA DE PAGAMENTO]. Além do aspecto financeiro, você ganha segurança jurídica, tranquilidade e alguém cuidando de cada etapa por você. Não existe garantia de resultado — o que eu garanto é técnica, estratégia e acompanhamento do início ao fim.$t$, 25)
on conflict (atalho) do nothing;

-- ===== supabase/migrations/20260925040000_drive.sql =====
-- =============================================================================
-- CRM Lara Café — migração 5
-- Integração com o Google Drive (repositório único de documentos por cliente).
-- =============================================================================
alter table public.contatos
  add column if not exists drive_pasta_id   text,      -- pasta do cliente no Drive compartilhado
  add column if not exists drive_pasta_url  text,
  add column if not exists drive_subpastas  jsonb not null default '{}';  -- { contrato: "<id>", pecas: "<id>", ... }

-- ===== supabase/migrations/20260925050000_quadro_relacionamento.sql =====
-- =============================================================================
-- CRM Lara Café — migração 6
-- Fluxo do quadro "Controle de relacionamento" (Trello): etiquetas de origem e de
-- motivo de não fechamento, pagamento da consulta e remarketing com opt-out.
-- =============================================================================

-- Quem pediu para não receber mensagens (LGPD: oposição ao legítimo interesse).
alter table public.contatos add column if not exists nao_contatar boolean not null default false;

-- Etiquetas de origem com os nomes do quadro.
update public.contatos set origem = 'Site' where origem in ('Formulário do site', 'Blog');
update public.contatos set origem = 'Indicação de parceiro/conhecido' where origem = 'Indicação de colega';
update public.contatos set origem = 'Outros' where origem = 'Outro';

-- Motivos de não fechamento com os nomes do quadro.
update public.contatos set motivo_perda = 'Achou caro' where motivo_perda = 'Honorários acima do orçamento';
update public.contatos set motivo_perda = 'Fechou com outro profissional' where motivo_perda = 'Escolheu outro escritório';
update public.contatos set motivo_perda = 'Não respondeu' where motivo_perda = 'Não respondeu mais';

insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('7. Follow-up', 'Remarketing — conteúdo do interesse dela', '/remarketing', $t$Oi, [NOME]! Tudo bem? Lembrei de você quando vi este conteúdo sobre [TEMA DA DEMANDA]: [LINK]. Achei que poderia ser útil. Se um dia quiser retomar a conversa, estou por aqui. (Se preferir não receber mais mensagens, é só me avisar.)$t$, 40),
('7. Follow-up', 'Remarketing — retomar a conversa', '/remarketing-retomar', $t$Oi, [NOME]! Há alguns meses conversamos sobre [DEMANDA]. Como estão as coisas por aí? Se fizer sentido agora, posso te explicar como seria o caminho, sem compromisso.$t$, 50)
on conflict (atalho) do nothing;

insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('10. Relacionamento', 'Relatório semanal do caso', '/relatorio-semanal', $t$[SAUDAÇÃO], [NOME]! Tudo bem?
Segue o relatório semanal com as atualizações do seu processo. [SE HOUVE MOVIMENTAÇÃO IMPORTANTE (EX.: DESIGNAÇÃO DE AUDIÊNCIA), DESCREVA AQUI O ANDAMENTO PARA RESSALTAR A INFORMAÇÃO]
Qualquer dúvida, estamos à disposição!

Te desejamos uma ótima semana! ✨$t$, 15)
on conflict (atalho) do nothing;

-- ===== supabase/migrations/20260925060000_mensagens_do_escritorio.sql =====
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
Aqui é do escritório da [DRA]. Estamos passando para saber como você se sentiu com a consulta de ontem e se surgiu alguma dúvida sobre os assuntos tratados que queira esclarecer.

Ficamos à disposição, e até amanhã enviaremos a proposta de honorários!$t$, 5),
('7. Follow-up', 'Remarketing — proposta sem resposta', '/remarketing-proposta', $t$[SAUDAÇÃO], [NOME]! Tudo bem?
Aqui é do escritório da [DRA]. Estamos passando para perguntar como está a situação [DESENVOLVER PARA O CASO ESPECÍFICO] e se restou alguma dúvida que gostaria de esclarecer sobre o caso.

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

-- ===== supabase/migrations/20260925070000_formulario_e_camadas.sql =====
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
