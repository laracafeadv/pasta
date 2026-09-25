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
