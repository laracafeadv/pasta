-- Conexão da Secretária com a conta Google da usuária (login OAuth): Gmail (somente leitura) e Google Agenda (criar eventos).
--  · google_conexoes: tokens da usuária, CIFRADOS pela aplicação. RLS ligada SEM políticas: só a chave de serviço do servidor lê.
--  · google_avisos_cache: resultado da leitura dos e-mails já processados (evita reler o corpo de cada e-mail a cada 5 minutos). Idem, só servidor.
--  · avisos_prazos: marca "Prazo lançado" de cada e-mail de intimação (um por usuária e conversa), ligada ao prazo e ao lembrete criados.
create table if not exists public.google_conexoes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  escopos text,
  refresh_token_enc text not null,
  access_token_enc text,
  expira_em timestamptz
);
alter table public.google_conexoes enable row level security;
create trigger google_conexoes_updated_at before update on public.google_conexoes for each row execute function public.set_updated_at();

create table if not exists public.google_avisos_cache (
  user_id uuid not null references public.profiles(id) on delete cascade,
  thread_id text not null check (char_length(thread_id) between 1 and 64),
  versao text not null,
  dados jsonb,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, thread_id)
);
alter table public.google_avisos_cache enable row level security;

create table if not exists public.avisos_prazos (
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  thread_id text not null check (char_length(thread_id) between 1 and 64),
  created_at timestamptz not null default now(),
  prazo date not null,
  dias int not null check (dias between 1 and 365),
  modo text not null check (modo in ('uteis', 'corridos')),
  ciencia date not null,
  tribunal text not null check (tribunal in ('tjba', 'trt5', 'jf', 'nac')),
  item_id bigint references public.secretaria_itens(id) on delete set null,
  lembrete_id bigint references public.lembretes_rapidos(id) on delete set null,
  evento_id text,
  evento_link text,
  primary key (user_id, thread_id)
);
alter table public.avisos_prazos enable row level security;
drop policy if exists "avisos_prazos: dono" on public.avisos_prazos;
create policy "avisos_prazos: dono" on public.avisos_prazos for all
  using (public.is_staff() and user_id = auth.uid()) with check (public.is_staff() and user_id = auth.uid());
