-- =============================================================================
-- CRM Lara Café — biblioteca de documentos: upload de arquivos por cliente,
-- com categoria e vínculo opcional a um caso. Bucket privado; acesso só via
-- link temporário gerado pelo servidor.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

create table if not exists public.arquivos (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  contato_id    bigint not null references public.contatos(id) on delete cascade,
  caso_id       bigint references public.casos(id) on delete set null,
  categoria     text not null default 'provas'
                check (categoria in ('recebidos','pessoais','contrato','pecas','provas','comunicacoes','financeiro','arquivo')),
  nome          text not null,
  descricao     text,
  path          text not null unique,
  mime          text not null,
  tamanho       bigint not null,
  enviado_por   uuid references public.profiles(id) on delete set null
);
create index if not exists arquivos_contato_idx on public.arquivos (contato_id, created_at desc);
create index if not exists arquivos_caso_idx on public.arquivos (caso_id);
alter table public.arquivos enable row level security;
create policy "arquivos: equipe" on public.arquivos
  for all using (public.is_staff()) with check (public.is_staff());
