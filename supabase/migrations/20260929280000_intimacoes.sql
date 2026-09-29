-- Intimações (registro manual): cada intimação/publicação de um PROCESSO JUDICIAL vira um registro tratável, com o prazo
-- (dias úteis), uma tarefa de trabalho e o andamento no processo. Sem integração com tribunais: quem registra é o escritório.
create table if not exists public.intimacoes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processo_id bigint not null references public.processos(id) on delete cascade,
  caso_id bigint not null references public.casos(id) on delete cascade,
  contato_id bigint not null references public.contatos(id) on delete cascade,
  data_publicacao date not null,
  tipo text not null check (tipo in ('Despacho', 'Decisão', 'Sentença', 'Citação', 'Intimação para manifestação', 'Audiência designada', 'Publicação no Diário', 'Outro')),
  conteudo text,
  dias_prazo int check (dias_prazo is null or (dias_prazo >= 1 and dias_prazo <= 365)),
  compromisso_id bigint references public.compromissos(id) on delete set null,
  tarefa_id bigint references public.tarefas_internas(id) on delete set null,
  status text not null default 'a_tratar' check (status in ('a_tratar', 'tratada')),
  tratada_em timestamptz,
  tratada_obs text,
  responsavel_id uuid references public.profiles(id) on delete set null
);
create index if not exists intimacoes_status_idx on public.intimacoes(status, data_publicacao desc);
create index if not exists intimacoes_processo_idx on public.intimacoes(processo_id);
create trigger intimacoes_updated_at before update on public.intimacoes for each row execute function public.set_updated_at();
alter table public.intimacoes enable row level security;
drop policy if exists "intimacoes: equipe" on public.intimacoes;
create policy "intimacoes: equipe" on public.intimacoes for all using (public.is_staff()) with check (public.is_staff());

-- Só processo JUDICIAL recebe intimação (o extrajudicial tem exigências/pendências).
create or replace function public.checar_intimacao_judicial() returns trigger
language plpgsql set search_path = public as $$
declare nat text; pc bigint; pct bigint;
begin
  select natureza, caso_id, contato_id into nat, pc, pct from public.processos where id = new.processo_id;
  if nat is distinct from 'judicial' then raise exception 'Intimação é de processo judicial; no procedimento extrajudicial registre a exigência em pendências.' using errcode = '23514'; end if;
  if new.caso_id is distinct from pc or new.contato_id is distinct from pct then raise exception 'A intimação precisa acompanhar a demanda e a pessoa do processo.' using errcode = '23514'; end if;
  return new;
end $$;
drop trigger if exists trg_intimacao_judicial on public.intimacoes;
create trigger trg_intimacao_judicial before insert or update of processo_id, caso_id, contato_id on public.intimacoes for each row execute function public.checar_intimacao_judicial();
