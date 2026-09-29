-- FASE 1 — integridade do modelo Pessoa → Demanda → Processo/Procedimento.
-- 1) Tudo que aponta para uma demanda (caso_id) e para uma pessoa (contato_id) tem que ser da MESMA pessoa.
-- 2) Um processo/procedimento nunca aponta para partes/documentos de outra demanda.
-- 3) As colunas de processo antigas em casos ficam somente-leitura: a fonte é public.processos / public.partes.

create or replace function public.checar_demanda_da_pessoa() returns trigger
language plpgsql set search_path = public as $$
declare dono bigint;
begin
  if new.caso_id is null then return new; end if;
  select contato_id into dono from public.casos where id = new.caso_id;
  if dono is null then raise exception 'Demanda % não existe.', new.caso_id using errcode = '23503'; end if;
  if new.contato_id is null then
    new.contato_id := dono;                      -- herda a pessoa da demanda
  elsif new.contato_id <> dono then
    raise exception 'A demanda % pertence a outra pessoa (%).', new.caso_id, dono using errcode = '23514';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['processos','documentos','honorarios','tarefas_internas','compromissos','atividades','lancamentos'] loop
    execute format('drop trigger if exists trg_demanda_da_pessoa on public.%I', t);
    execute format('create trigger trg_demanda_da_pessoa before insert or update of caso_id, contato_id on public.%I for each row execute function public.checar_demanda_da_pessoa()', t);
  end loop;
end $$;

-- Processo/procedimento referenciado por documento ou prazo tem que ser da mesma demanda; parte idem.
create or replace function public.checar_vinculos_da_demanda() returns trigger
language plpgsql set search_path = public as $$
declare pc bigint;
begin
  if tg_table_name in ('documentos', 'compromissos') and new.processo_id is not null then
    select caso_id into pc from public.processos where id = new.processo_id;
    if new.caso_id is null then new.caso_id := pc;
    elsif pc is distinct from new.caso_id then raise exception 'O processo/procedimento % não pertence à demanda %.', new.processo_id, new.caso_id using errcode = '23514'; end if;
  end if;
  if tg_table_name = 'documentos' and new.parte_id is not null then
    select caso_id into pc from public.partes where id = new.parte_id;
    if pc is distinct from new.caso_id then raise exception 'A parte % não pertence à demanda %.', new.parte_id, new.caso_id using errcode = '23514'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_vinculos_da_demanda on public.documentos;
create trigger trg_vinculos_da_demanda before insert or update of caso_id, processo_id, parte_id on public.documentos for each row execute function public.checar_vinculos_da_demanda();
drop trigger if exists trg_vinculos_da_demanda on public.compromissos;
create trigger trg_vinculos_da_demanda before insert or update of caso_id, processo_id on public.compromissos for each row execute function public.checar_vinculos_da_demanda();

-- Colunas obsoletas de casos: não aceitam novos valores (os antigos ficam como histórico).
create or replace function public.bloquear_campos_obsoletos_de_casos() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Só barra quando entra valor NOVO nas colunas antigas (limpar para nulo continua permitido).
  if (tg_op = 'INSERT' or (new.numero_processo, new.orgao, new.comarca, new.uf, new.fase_processual, new.valor_causa, new.link_tribunal, new.parte_contraria)
          is distinct from (old.numero_processo, old.orgao, old.comarca, old.uf, old.fase_processual, old.valor_causa, old.link_tribunal, old.parte_contraria))
     and coalesce(new.numero_processo, new.orgao, new.comarca, new.uf, new.fase_processual, new.valor_causa::text, new.link_tribunal, new.parte_contraria) is not null then
    raise exception 'Campos de processo em casos são obsoletos: use public.processos e public.partes.' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists trg_campos_obsoletos on public.casos;
create trigger trg_campos_obsoletos before insert or update on public.casos for each row execute function public.bloquear_campos_obsoletos_de_casos();

comment on table public.casos is 'DEMANDAS/SERVIÇOS do cliente. O nome "casos" é físico (compatibilidade); no produto o conceito é Demanda. Processo/procedimento: public.processos.';
comment on column public.tarefas_internas.caso_id is 'Demanda (FK para public.casos)';
