-- Histórico rastreável por demanda (opcional) + remoção de tabela vazia exclusiva da Ana (RAG, sem nenhuma referência no código).
alter table public.atividades add column if not exists caso_id bigint references public.casos(id) on delete set null;
create index if not exists atividades_caso_idx on public.atividades(caso_id) where caso_id is not null;
drop table if exists public.informacoes_adicional_rag;
