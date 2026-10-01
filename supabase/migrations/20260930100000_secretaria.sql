-- Secretária: painel pessoal de cada usuária da equipe (Início). Três tabelas pequenas, todas só para a equipe (is_staff):
--  · lembretes_rapidos: lembretes soltos de cada usuária (pendentes/concluídos), que podem virar compromisso na agenda;
--  · suspensoes_expediente: suspensões de expediente anotadas pela equipe (valem no cálculo de prazo);
--  · secretaria_config: atalhos e preferências de cada usuária (tribunal padrão, cidade, atalhos).
create table if not exists public.lembretes_rapidos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 300),
  data date,
  hora time,
  feito boolean not null default false,
  feito_em timestamptz,
  compromisso_id bigint references public.compromissos(id) on delete set null
);
create index if not exists lembretes_rapidos_user_idx on public.lembretes_rapidos(user_id, feito, data);
alter table public.lembretes_rapidos enable row level security;
drop policy if exists "lembretes_rapidos: dono" on public.lembretes_rapidos;
create policy "lembretes_rapidos: dono" on public.lembretes_rapidos for all
  using (public.is_staff() and user_id = auth.uid()) with check (public.is_staff() and user_id = auth.uid());

create table if not exists public.suspensoes_expediente (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  de date not null,
  ate date not null,
  tribunal text not null default 'todos' check (tribunal in ('todos', 'tjba', 'trt5', 'jf')),
  motivo text check (motivo is null or char_length(motivo) <= 200),
  criado_por uuid default auth.uid() references public.profiles(id) on delete set null,
  check (ate >= de and ate - de <= 60)
);
create index if not exists suspensoes_expediente_de_idx on public.suspensoes_expediente(de, ate);
alter table public.suspensoes_expediente enable row level security;
drop policy if exists "suspensoes_expediente: equipe" on public.suspensoes_expediente;
create policy "suspensoes_expediente: equipe" on public.suspensoes_expediente for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.secretaria_config (
  user_id uuid primary key default auth.uid() references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  tribunal text not null default 'tjba' check (tribunal in ('tjba', 'trt5', 'jf', 'nac')),
  pontos_facultativos boolean not null default false,
  cidade text not null default 'Salvador' check (char_length(cidade) <= 80),
  atalhos jsonb not null default '[]'::jsonb check (jsonb_typeof(atalhos) = 'array' and jsonb_array_length(atalhos) <= 24)
);
alter table public.secretaria_config enable row level security;
drop policy if exists "secretaria_config: dono" on public.secretaria_config;
create policy "secretaria_config: dono" on public.secretaria_config for all
  using (public.is_staff() and user_id = auth.uid()) with check (public.is_staff() and user_id = auth.uid());
create trigger secretaria_config_updated_at before update on public.secretaria_config for each row execute function public.set_updated_at();
