-- =============================================================================
-- CRM Lara Café — sistema completo de formulários de pré-consulta:
-- banco de perguntas reutilizável, formulários montados a partir delas,
-- envios rastreados por link e respostas armazenadas com snapshot
-- (uma edição posterior na pergunta ou no formulário nunca altera uma
-- resposta já recebida).
-- =============================================================================
drop table if exists public.formulario_templates;

create table if not exists public.formulario_perguntas (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  texto       text not null,
  tipo        text not null default 'texto_curto'
              check (tipo in ('texto_curto','texto_longo','numero','data','email','telefone','sim_nao','selecao_unica','selecao_multipla')),
  opcoes      jsonb not null default '[]'::jsonb,
  arquivada   boolean not null default false
);
create trigger formulario_perguntas_updated_at before update on public.formulario_perguntas
  for each row execute function public.set_updated_at();
alter table public.formulario_perguntas enable row level security;
create policy "formulario_perguntas: equipe" on public.formulario_perguntas
  for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.formularios (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  nome        text not null,
  ativo       boolean not null default true
);
create trigger formularios_updated_at before update on public.formularios
  for each row execute function public.set_updated_at();
alter table public.formularios enable row level security;
create policy "formularios: equipe" on public.formularios
  for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.formulario_itens (
  id          bigint generated always as identity primary key,
  formulario_id bigint not null references public.formularios(id) on delete cascade,
  pergunta_id   bigint not null references public.formulario_perguntas(id) on delete restrict,
  ordem         int not null default 0,
  obrigatoria   boolean not null default false,
  unique (formulario_id, pergunta_id)
);
create index if not exists formulario_itens_formulario_idx on public.formulario_itens (formulario_id, ordem);
alter table public.formulario_itens enable row level security;
create policy "formulario_itens: equipe" on public.formulario_itens
  for all using (public.is_staff()) with check (public.is_staff());

create table if not exists public.formulario_envios (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  formulario_id bigint references public.formularios(id) on delete set null,
  contato_id    bigint not null references public.contatos(id) on delete cascade,
  token         text not null unique,
  expira_em     timestamptz not null,
  visualizado_em timestamptz,
  respondido_em  timestamptz,
  status        text not null default 'enviado' check (status in ('enviado','visualizado','respondido'))
);
create index if not exists formulario_envios_contato_idx on public.formulario_envios (contato_id, created_at desc);
alter table public.formulario_envios enable row level security;
create policy "formulario_envios: equipe" on public.formulario_envios
  for all using (public.is_staff()) with check (public.is_staff());

-- Snapshot: guarda o texto/tipo da pergunta como estavam no momento do envio,
-- para uma edição posterior no banco de perguntas nunca alterar uma resposta já recebida.
create table if not exists public.formulario_envio_respostas (
  id             bigint generated always as identity primary key,
  envio_id       bigint not null references public.formulario_envios(id) on delete cascade,
  ordem          int not null default 0,
  pergunta_texto text not null,
  pergunta_tipo  text not null,
  resposta       jsonb
);
create index if not exists formulario_envio_respostas_envio_idx on public.formulario_envio_respostas (envio_id, ordem);
alter table public.formulario_envio_respostas enable row level security;
create policy "formulario_envio_respostas: equipe" on public.formulario_envio_respostas
  for all using (public.is_staff()) with check (public.is_staff());
