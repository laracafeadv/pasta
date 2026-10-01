-- Secretária · aba Iniciais: controle das petições iniciais (quadro por etapa), independente das demandas/processos do CRM.
-- Etapas: aguardando → produzir → redacao → revisao → pronta → protocolada. Depois de protocolada: data e número do processo (CNJ).
create table if not exists public.secretaria_iniciais (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  cliente text not null check (char_length(btrim(cliente)) between 1 and 120),
  acao text check (acao is null or char_length(acao) <= 160),
  area text check (area is null or char_length(area) <= 60),
  parte_contraria text check (parte_contraria is null or char_length(parte_contraria) <= 160),
  meta_protocolo date,
  prazo_fatal date,
  prazo_fatal_tipo text check (prazo_fatal_tipo is null or prazo_fatal_tipo in ('prescricao', 'decadencia', 'outro')),
  prioridade text not null default 'normal' check (prioridade in ('alta', 'normal', 'baixa')),
  etapa text not null default 'aguardando' check (etapa in ('aguardando', 'produzir', 'redacao', 'revisao', 'pronta', 'protocolada')),
  etapa_desde timestamptz not null default now(),
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array' and jsonb_array_length(checklist) <= 40),
  obs text check (obs is null or char_length(obs) <= 2000),
  processo_numero text check (processo_numero is null or processo_numero ~ '^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$'),
  protocolo_data date,
  -- a meta de protocolo nunca passa do prazo fatal
  check (meta_protocolo is null or prazo_fatal is null or meta_protocolo <= prazo_fatal),
  -- protocolada precisa da data do protocolo
  check (etapa <> 'protocolada' or protocolo_data is not null)
);
create index if not exists secretaria_iniciais_etapa_idx on public.secretaria_iniciais(etapa, meta_protocolo);
create trigger secretaria_iniciais_updated_at before update on public.secretaria_iniciais for each row execute function public.set_updated_at();
alter table public.secretaria_iniciais enable row level security;
drop policy if exists "secretaria_iniciais: equipe" on public.secretaria_iniciais;
create policy "secretaria_iniciais: equipe" on public.secretaria_iniciais for all using (public.is_staff()) with check (public.is_staff());
