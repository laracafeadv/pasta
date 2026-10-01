-- =============================================================================
-- CRM Lara Café — recibos vinculados a um honorário/pagamento, com histórico
-- e geração de PDF.
-- =============================================================================
create table if not exists public.recibos (
  id             bigint generated always as identity primary key,
  created_at     timestamptz not null default now(),
  honorario_id   bigint references public.honorarios(id) on delete set null,
  contato_id     bigint not null references public.contatos(id) on delete cascade,
  nome_cliente   text not null,
  documento_cliente text,
  valor          numeric(12,2) not null,
  valor_extenso  text not null,
  referente_a    text not null,
  forma_pagamento text,
  numero_parcela text,
  data           date not null default current_date,
  criado_por     uuid references public.profiles(id) on delete set null
);
create index if not exists recibos_contato_idx on public.recibos (contato_id, created_at desc);
alter table public.recibos enable row level security;
create policy "recibos: equipe" on public.recibos
  for all using (public.is_staff()) with check (public.is_staff());
