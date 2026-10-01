-- FASE 4 — Judicial × Extrajudicial. Infraestrutura comum (processos), fluxos próprios.
-- Judicial: CNJ, tribunal, vara, comarca, fase, partes (polo), movimentações, prazos.
-- Extrajudicial: tipo de procedimento, cartório/serventia, ETAPAS formais, PENDÊNCIAS (exigências) e conclusão do ato.

-- 1) Desfecho (conclusão) do processo/procedimento
alter table public.processos add column if not exists desfecho text;
comment on column public.processos.desfecho is 'Conclusão: judicial (sentença, acordo, partilha…) ou extrajudicial (escritura lavrada, registro concluído…).';

-- 2) Campos próprios de cada natureza não se misturam
alter table public.processos drop constraint if exists processos_campos_por_natureza;
alter table public.processos add constraint processos_campos_por_natureza check (
  (natureza = 'judicial' and tipo_procedimento is null) or (natureza = 'extrajudicial' and tribunal is null)
);

-- 3) Etapas formais do procedimento extrajudicial
create table if not exists public.processo_etapas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  processo_id bigint not null references public.processos(id) on delete cascade,
  ordem int not null default 0,
  titulo text not null check (length(btrim(titulo)) > 0),
  status text not null default 'pendente' check (status in ('pendente', 'concluida', 'dispensada')),
  data_prevista date,
  concluida_em date,
  observacao text
);
create index if not exists processo_etapas_idx on public.processo_etapas(processo_id, ordem);

-- 4) Pendências / exigências (o que trava o andamento e quem resolve)
create table if not exists public.processo_pendencias (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  processo_id bigint not null references public.processos(id) on delete cascade,
  descricao text not null check (length(btrim(descricao)) > 0),
  aguardando text not null default 'cliente' check (aguardando in ('cliente', 'orgao', 'escritorio', 'terceiro')),
  prazo date,
  resolvida_em date,
  observacao text
);
create index if not exists processo_pendencias_idx on public.processo_pendencias(processo_id, resolvida_em);

do $$
declare t text;
begin
  foreach t in array array['processo_etapas', 'processo_pendencias'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: equipe" on public.%I', t, t);
    execute format('create policy "%s: equipe" on public.%I for all using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- 5) Tarefas e histórico também podem ser do processo/procedimento
alter table public.tarefas_internas add column if not exists processo_id bigint references public.processos(id) on delete set null;
alter table public.atividades add column if not exists processo_id bigint references public.processos(id) on delete set null;
create index if not exists tarefas_processo_idx on public.tarefas_internas(processo_id) where processo_id is not null;
create index if not exists atividades_processo_idx on public.atividades(processo_id) where processo_id is not null;

-- 6) Polo da parte (relevante no judicial)
alter table public.partes add column if not exists polo text check (polo in ('ativo', 'passivo'));

-- 7) O processo referenciado tem que ser da mesma demanda (agora também em tarefas e histórico)
create or replace function public.checar_vinculos_da_demanda() returns trigger
language plpgsql set search_path = public as $$
declare pc bigint; pcontato bigint;
begin
  if tg_table_name in ('documentos', 'compromissos', 'tarefas_internas', 'atividades') and new.processo_id is not null then
    select caso_id, contato_id into pc, pcontato from public.processos where id = new.processo_id;
    if new.caso_id is null then new.caso_id := pc; if new.contato_id is null then new.contato_id := pcontato; end if;
    elsif pc is distinct from new.caso_id then raise exception 'O processo/procedimento % não pertence à demanda %.', new.processo_id, new.caso_id using errcode = '23514'; end if;
  end if;
  -- (IFs aninhados: só documentos tem parte_id; PL/pgSQL não garante curto-circuito no AND)
  if tg_table_name = 'documentos' then
    if new.parte_id is not null then
      select caso_id into pc from public.partes where id = new.parte_id;
      if pc is distinct from new.caso_id then raise exception 'A parte % não pertence à demanda %.', new.parte_id, new.caso_id using errcode = '23514'; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_vinculos_da_demanda on public.tarefas_internas;
create trigger trg_vinculos_da_demanda before insert or update of caso_id, processo_id on public.tarefas_internas for each row execute function public.checar_vinculos_da_demanda();
drop trigger if exists trg_vinculos_da_demanda on public.atividades;
create trigger trg_vinculos_da_demanda before insert or update of caso_id, processo_id on public.atividades for each row execute function public.checar_vinculos_da_demanda();
-- (quando só o processo é informado, a demanda e a pessoa vêm dele)

-- 8) Inventário passa a ter as duas formas (extrajudicial e judicial); o antigo "padrao" era o roteiro extrajudicial.
update public.casos set procedimento = 'inventario/extrajudicial' where procedimento = 'inventario/padrao';
update public.formularios set procedimentos = array_replace(procedimentos, 'inventario/padrao', 'inventario/extrajudicial') where 'inventario/padrao' = any(procedimentos);
update public.formulario_perguntas set procedimentos = array_replace(procedimentos, 'inventario/padrao', 'inventario/extrajudicial') where 'inventario/padrao' = any(procedimentos);
