-- FASE 5 — Partes, interessados e pessoas relacionadas: nenhuma pessoa duplicada.
-- A parte APONTA para a pessoa (contatos) — não copia. A mesma pessoa não entra duas vezes na mesma demanda.
-- A parte pode ser da demanda inteira ou de um processo/procedimento específico dela.

-- 1) A mesma pessoa não aparece duas vezes na mesma demanda
create unique index if not exists partes_caso_pessoa_uq on public.partes (caso_id, contato_id) where contato_id is not null;

-- 2) Parte de um processo/procedimento específico (nulo = da demanda toda)
alter table public.partes add column if not exists processo_id bigint references public.processos(id) on delete set null;
create index if not exists partes_processo_idx on public.partes(processo_id) where processo_id is not null;

create or replace function public.checar_parte_processo() returns trigger
language plpgsql set search_path = public as $$
declare pc bigint;
begin
  if new.processo_id is not null then
    select caso_id into pc from public.processos where id = new.processo_id;
    if pc is distinct from new.caso_id then raise exception 'O processo/procedimento % não pertence à demanda %.', new.processo_id, new.caso_id using errcode = '23514'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_parte_processo on public.partes;
create trigger trg_parte_processo before insert or update of caso_id, processo_id on public.partes for each row execute function public.checar_parte_processo();

-- 3) Busca de pessoa por nome/e-mail (a busca por telefone já usa a chave única)
create index if not exists contatos_nome_lower_idx on public.contatos (lower(nome));
comment on column public.partes.contato_id is 'Pessoa cadastrada (contatos). Nulo só quando a parte não foi cadastrada como pessoa; pode ser vinculada depois.';
