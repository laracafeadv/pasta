-- FASE 3 — Demanda/Serviço e Análise jurídica.
-- 1) Atuação "documental" (elaboração de documentos: pacto, testamento, contratos), separada da "consultiva" (orientação/parecer).
alter table public.casos drop constraint if exists casos_tipo_check;
alter table public.casos add constraint casos_tipo_check check (tipo = any (array['consultivo','documental','extrajudicial','judicial']));

-- 2) Análise profissional do escritório: campos PRÓPRIOS da demanda (não dependem do construtor de formulários).
--    analise = fundamentos/raciocínio jurídico (já existia); riscos e decisao já existiam.
alter table public.casos
  add column if not exists fatos text,        -- fatos relevantes (resumo profissional do que foi coletado)
  add column if not exists estrategia text,   -- caminho recomendado / estratégia
  add column if not exists conclusao text;    -- conclusão / parecer (o que se comunica ao cliente)
comment on column public.casos.analise is 'Análise profissional: fundamentos e raciocínio jurídico (produzido pelo escritório).';
comment on column public.casos.fatos is 'Análise profissional: fatos relevantes.';
comment on column public.casos.estrategia is 'Análise profissional: estratégia / caminho recomendado.';
comment on column public.casos.conclusao is 'Análise profissional: conclusão / parecer.';

-- 3) Anotações datadas da análise (raciocínio que evolui ao longo do atendimento; nada se sobrescreve).
create table if not exists public.demanda_notas (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  caso_id bigint not null references public.casos(id) on delete cascade,
  contato_id bigint references public.contatos(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  tipo text not null default 'anotacao' check (tipo in ('anotacao', 'conclusao', 'observacao')),
  texto text not null check (length(btrim(texto)) > 0)
);
create index if not exists demanda_notas_caso_idx on public.demanda_notas(caso_id, created_at desc);
alter table public.demanda_notas enable row level security;
drop policy if exists "demanda_notas: equipe" on public.demanda_notas;
create policy "demanda_notas: equipe" on public.demanda_notas for all using (public.is_staff()) with check (public.is_staff());
drop trigger if exists trg_demanda_da_pessoa on public.demanda_notas;
create trigger trg_demanda_da_pessoa before insert or update of caso_id, contato_id on public.demanda_notas
  for each row execute function public.checar_demanda_da_pessoa();

-- 4) Responsável: toda demanda tem um (as antigas sem responsável ficam com a administradora do escritório).
update public.casos set responsavel_id = (select id from public.profiles where role = 'admin' order by created_at limit 1)
where responsavel_id is null;

-- 5) O antigo "Diagnóstico" virou perguntas: o que elas coletam são DADOS DA CONSULTA (não a análise do escritório).
update public.formularios set nome = 'Dados da consulta', descricao = 'Dados coletados na consulta (perguntas). A análise profissional do escritório fica na própria demanda.'
where nome = 'Análise da consulta' and contexto = 'demanda';
update public.formulario_secoes set titulo = 'Dados da consulta'
where titulo = 'Análise da consulta' and formulario_id in (select id from public.formularios where nome = 'Dados da consulta');
update public.formulario_perguntas set secao = 'Dados da consulta' where secao = 'Análise da consulta';
