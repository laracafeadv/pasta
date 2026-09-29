-- Construtor de formulários (estilo Google Forms) — evolução da arquitetura existente, sem recriar:
--   banco de perguntas (formulario_perguntas)  +  formulários (formularios)  +  itens (formulario_itens)
--   NOVO: contexto do formulário, seções próprias, condição por item/seção, histórico de versões da pergunta.
-- Respostas continuam em contato_respostas / caso_respostas (uma resposta atual por pergunta) e nos
-- snapshots de envio (formulario_envio_respostas). Nada é apagado.

-- 1) Formulário: descrição e CONTEXTO (onde as respostas moram e onde o formulário aparece)
alter table public.formularios
  add column if not exists descricao text,
  add column if not exists contexto text not null default 'cliente' check (contexto in ('cliente', 'consulta', 'demanda')),
  add column if not exists procedimentos text[] not null default '{}';
comment on column public.formularios.contexto is 'cliente/consulta: respostas em contato_respostas (ficha do cliente); demanda: caso_respostas (ficha da demanda, opcionalmente só para certos procedimentos).';

-- 2) Seções do formulário
create table if not exists public.formulario_secoes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  formulario_id bigint not null references public.formularios(id) on delete cascade,
  titulo text not null default 'Seção',
  descricao text,
  ordem int not null default 0,
  mostrar_se jsonb  -- { juntar: 'e'|'ou', regras: [{ pergunta_id, operador, valor }] }
);
create index if not exists formulario_secoes_form_idx on public.formulario_secoes(formulario_id, ordem);
alter table public.formulario_secoes enable row level security;
drop policy if exists "formulario_secoes: equipe" on public.formulario_secoes;
create policy "formulario_secoes: equipe" on public.formulario_secoes for all using (public.is_staff()) with check (public.is_staff());

-- 3) Itens: seção e condição (a condição é do item NO formulário; a mesma pergunta pode ser condicional num e livre noutro)
alter table public.formulario_itens
  add column if not exists secao_id bigint references public.formulario_secoes(id) on delete set null,
  add column if not exists mostrar_se jsonb;
create index if not exists formulario_itens_secao_idx on public.formulario_itens(secao_id);

-- 4) Tipo "lista suspensa" (uma escolha, para muitas opções)
alter table public.formulario_perguntas drop constraint if exists formulario_perguntas_tipo_check;
alter table public.formulario_perguntas add constraint formulario_perguntas_tipo_check check (tipo = any (array[
  'texto_curto','texto_longo','numero','data','email','telefone','sim_nao','selecao_unica','selecao_multipla','checklist','lista_suspensa'
]));

-- 5) Histórico de versões da pergunta: toda mudança de texto/tipo/opções/ajuda guarda a versão anterior.
alter table public.formulario_perguntas add column if not exists versao int not null default 1;
create table if not exists public.formulario_pergunta_versoes (
  id bigint generated always as identity primary key,
  pergunta_id bigint not null references public.formulario_perguntas(id) on delete cascade,
  versao int not null,
  texto text not null,
  tipo text not null,
  opcoes jsonb not null default '[]'::jsonb,
  ajuda text,
  substituida_em timestamptz not null default now(),
  unique (pergunta_id, versao)
);
alter table public.formulario_pergunta_versoes enable row level security;
drop policy if exists "formulario_pergunta_versoes: equipe" on public.formulario_pergunta_versoes;
create policy "formulario_pergunta_versoes: equipe" on public.formulario_pergunta_versoes for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.guardar_versao_pergunta() returns trigger
language plpgsql set search_path = public as $$
begin
  if (old.texto, old.tipo, old.opcoes, old.ajuda) is distinct from (new.texto, new.tipo, new.opcoes, new.ajuda) then
    insert into public.formulario_pergunta_versoes (pergunta_id, versao, texto, tipo, opcoes, ajuda)
    values (old.id, old.versao, old.texto, old.tipo, old.opcoes, old.ajuda)
    on conflict (pergunta_id, versao) do nothing;
    new.versao := old.versao + 1;
  end if;
  return new;
end $$;
drop trigger if exists trg_versao_pergunta on public.formulario_perguntas;
create trigger trg_versao_pergunta before update on public.formulario_perguntas
  for each row execute function public.guardar_versao_pergunta();

-- 6) Snapshot do envio guarda também a pergunta de origem e a seção (histórico legível mesmo se o formulário mudar)
alter table public.formulario_envio_respostas
  add column if not exists pergunta_id bigint references public.formulario_perguntas(id) on delete set null,
  add column if not exists secao_titulo text;

-- 7) Coerência: pergunta de formulário "demanda" tem escopo demanda; cliente/consulta, escopo cliente.
create or replace function public.checar_item_formulario() returns trigger
language plpgsql set search_path = public as $$
declare ctx text; esc text;
begin
  select contexto into ctx from public.formularios where id = new.formulario_id;
  select escopo into esc from public.formulario_perguntas where id = new.pergunta_id;
  if (ctx = 'demanda') is distinct from (esc = 'demanda') then
    raise exception 'Pergunta de escopo "%" não cabe em formulário de contexto "%".', esc, ctx using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists trg_item_formulario on public.formulario_itens;
create trigger trg_item_formulario before insert or update of pergunta_id, formulario_id on public.formulario_itens
  for each row execute function public.checar_item_formulario();

-- 8) Migração dos dados existentes (sem perder nada)
-- 8a) O formulário que já existia é o da pré-consulta.
update public.formularios set contexto = 'consulta'
where nome ilike '%consulta%' and contexto = 'cliente' and not exists (select 1 from public.formulario_secoes s where s.formulario_id = formularios.id);

-- 8b) Perguntas soltas (que só existiam no banco e apareciam na ficha) viram formulários por contexto.
do $$
declare g record; f bigint;
begin
  for g in
    select escopo, procedimentos, min(secao) as nome_secao
    from public.formulario_perguntas p
    where not exists (select 1 from public.formulario_itens i where i.pergunta_id = p.id)
    group by escopo, procedimentos
  loop
    insert into public.formularios (nome, contexto, procedimentos, descricao)
    values (case when g.escopo = 'cliente' then 'Informações do cliente' else coalesce(g.nome_secao, 'Informações da demanda') end,
            case when g.escopo = 'cliente' then 'cliente' else 'demanda' end, coalesce(g.procedimentos, '{}'),
            'Criado automaticamente a partir das perguntas que já existiam.')
    returning id into f;
    insert into public.formulario_itens (formulario_id, pergunta_id, ordem, obrigatoria)
    select f, p.id, p.ordem, false from public.formulario_perguntas p
    where p.escopo = g.escopo and p.procedimentos = g.procedimentos
      and not exists (select 1 from public.formulario_itens i where i.pergunta_id = p.id);
  end loop;
end $$;

-- 8c) Uma seção por "secao" antiga em cada formulário; os itens são ligados a ela e a ordem é preservada.
do $$
declare r record; s bigint;
begin
  for r in
    select i.formulario_id, p.secao, min(p.ordem) as o
    from public.formulario_itens i join public.formulario_perguntas p on p.id = i.pergunta_id
    where i.secao_id is null group by i.formulario_id, p.secao order by i.formulario_id, min(p.ordem)
  loop
    insert into public.formulario_secoes (formulario_id, titulo, ordem)
    values (r.formulario_id, r.secao, r.o) returning id into s;
    update public.formulario_itens i set secao_id = s
    from public.formulario_perguntas p
    where p.id = i.pergunta_id and i.formulario_id = r.formulario_id and p.secao = r.secao and i.secao_id is null;
  end loop;
  update public.formulario_secoes set ordem = t.rn
  from (select id, row_number() over (partition by formulario_id order by ordem, id) rn from public.formulario_secoes) t
  where t.id = formulario_secoes.id;
end $$;

-- 8d) Condições antigas ({pergunta_id, igual_a} na pergunta) viram condição do item (formato novo).
update public.formulario_itens i
set mostrar_se = jsonb_build_object('juntar', 'e', 'regras', jsonb_build_array(jsonb_build_object('pergunta_id', (p.mostrar_se->>'pergunta_id')::bigint, 'operador', 'igual', 'valor', p.mostrar_se->>'igual_a')))
from public.formulario_perguntas p
where p.id = i.pergunta_id and p.mostrar_se is not null and i.mostrar_se is null;
