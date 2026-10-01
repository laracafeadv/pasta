-- =============================================================================
-- CRM Lara Café — Gerador de Documentos: modelos com variáveis {{token}} e
-- histórico de documentos emitidos, vinculados a cliente/caso.
-- =============================================================================
create table if not exists public.documento_modelos (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  nome        text not null,
  categoria   text not null default 'personalizado'
              check (categoria in ('recibo','contrato_honorarios','procuracao','declaracao','notificacao','carta','termo','requerimento','personalizado')),
  descricao   text,
  conteudo    text not null default '',
  ativo       boolean not null default true
);
create trigger documento_modelos_updated_at before update on public.documento_modelos
  for each row execute function public.set_updated_at();
alter table public.documento_modelos enable row level security;
create policy "documento_modelos: equipe" on public.documento_modelos
  for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.documentos_gerados (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  modelo_id   bigint references public.documento_modelos(id) on delete set null,
  nome        text not null,
  categoria   text not null,
  contato_id  bigint not null references public.contatos(id) on delete cascade,
  caso_id     bigint references public.casos(id) on delete set null,
  honorario_id bigint references public.honorarios(id) on delete set null,
  valor       numeric(12,2),
  dados       jsonb not null default '{}'::jsonb,
  conteudo_final text not null,
  criado_por  uuid references public.profiles(id) on delete set null
);
create index if not exists documentos_gerados_contato_idx on public.documentos_gerados (contato_id, created_at desc);
alter table public.documentos_gerados enable row level security;
create policy "documentos_gerados: equipe" on public.documentos_gerados
  for all using (public.is_staff()) with check (public.is_staff());
