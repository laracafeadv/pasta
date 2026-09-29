-- Tarefa passa a ter uma única fonte de "quando": a data (prazo), obrigatória.
-- A coluna manual (hoje/semana/mes/quando_der) duplicava esse conceito e sai.
update public.tarefas_internas set prazo = (now() at time zone 'America/Bahia')::date where prazo is null;
alter table public.tarefas_internas alter column prazo set default (now() at time zone 'America/Bahia')::date;
alter table public.tarefas_internas alter column prazo set not null;
alter table public.tarefas_internas drop column if exists coluna;
create index if not exists tarefas_internas_prazo_idx on public.tarefas_internas (prazo) where concluida = false;
