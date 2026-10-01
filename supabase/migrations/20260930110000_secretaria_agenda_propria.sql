-- A Secretária passa a ter agenda PRÓPRIA (prazos, audiências, consultas, compromissos e tarefas), sem depender das telas de
-- Agenda/Prazos/Tarefas do CRM. Itens são do escritório (toda a equipe vê), com o autor em user_id ("só as minhas").
create table if not exists public.secretaria_itens (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('prazo', 'audiencia', 'consulta', 'compromisso', 'tarefa')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  dia date not null,
  hora time,
  local text check (local is null or char_length(local) <= 200),
  cliente text check (cliente is null or char_length(cliente) <= 120),
  obs text check (obs is null or char_length(obs) <= 1000),
  dias_prazo int check (dias_prazo is null or (dias_prazo between 1 and 365)),
  data_intimacao date,
  tribunal text check (tribunal is null or tribunal in ('tjba', 'trt5', 'jf', 'nac')),
  feito boolean not null default false,
  feito_em timestamptz
);
create index if not exists secretaria_itens_dia_idx on public.secretaria_itens(feito, dia);
alter table public.secretaria_itens enable row level security;
drop policy if exists "secretaria_itens: equipe" on public.secretaria_itens;
create policy "secretaria_itens: equipe" on public.secretaria_itens for all using (public.is_staff()) with check (public.is_staff());

-- "Pôr na agenda" do lembrete aponta para o item da própria Secretária (a coluna antiga apontava para o CRM; tabela ainda vazia).
alter table public.lembretes_rapidos add column if not exists item_id bigint references public.secretaria_itens(id) on delete set null;
alter table public.lembretes_rapidos drop column if exists compromisso_id;
