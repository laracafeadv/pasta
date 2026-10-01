-- Checklist operacional da ficha (Padrão Operacional executável).
-- As definições dos itens ficam no código; aqui só ficam as marcações MANUAIS (quem e quando).
-- Itens calculados a partir de dados que o CRM já tem (honorários, documentos, formulário…) não são gravados.
alter table public.casos add column if not exists procedimento text; -- 'servico/variante' do Padrão Operacional (ex.: divorcio/extrajudicial)

create table if not exists public.checklist_marcas (
  id           bigint generated always as identity primary key,
  contato_id   bigint not null references public.contatos(id) on delete cascade,
  caso_id      bigint references public.casos(id) on delete cascade, -- nulo = checklist do atendimento (cliente)
  chave        text not null,
  concluido_em timestamptz not null default now(),
  concluido_por uuid references public.profiles(id) on delete set null
);
create unique index if not exists checklist_marcas_unica on public.checklist_marcas (contato_id, coalesce(caso_id, 0), chave);
create index if not exists checklist_marcas_caso_idx on public.checklist_marcas (caso_id) where caso_id is not null;
create index if not exists checklist_marcas_por_idx on public.checklist_marcas (concluido_por) where concluido_por is not null;

alter table public.checklist_marcas enable row level security;
create policy "staff pode tudo em checklist_marcas" on public.checklist_marcas
  for all to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));
