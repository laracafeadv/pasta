-- =============================================================================
-- CRM Lara Café — tarefas internas ganham prazo, prioridade e vínculo opcional
-- a cliente/caso, para sustentar a tela própria /tarefas (Hoje/Atrasadas/
-- Próximas/Concluídas) além do quadro já existente na tela Hoje.
-- =============================================================================
alter table public.tarefas_internas
  add column if not exists prazo date,
  add column if not exists prioridade text not null default 'media' check (prioridade in ('baixa','media','alta')),
  add column if not exists contato_id bigint references public.contatos(id) on delete set null,
  add column if not exists caso_id bigint references public.casos(id) on delete set null;
create index if not exists tarefas_internas_prazo_idx on public.tarefas_internas (prazo) where not concluida;
