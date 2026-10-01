create table public.ana_insights (
  id bigint generated always as identity primary key,
  texto text not null,
  categoria text,
  created_at timestamptz not null default now()
);
alter table public.ana_insights enable row level security;
create policy "staff pode ler ana_insights" on public.ana_insights for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','equipe'))
);
