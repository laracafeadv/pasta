-- Tarefas internas do escritório: afazeres que não estão ligados a nenhum
-- cliente ou caso específico (ex.: "estudar tal tema", "organizar modelo de peça").

create table if not exists public.tarefas_internas (
  id          bigint generated always as identity primary key,
  titulo      text not null,
  descricao   text,
  coluna      text not null default 'hoje' check (coluna in ('hoje', 'semana', 'mes', 'quando_der')),
  concluida   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.tarefas_internas enable row level security;

create policy "staff pode tudo em tarefas_internas" on public.tarefas_internas
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'equipe')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'equipe')));
