-- Ficha dinâmica: o banco de perguntas passa a ter seção, ordem, ajuda e o tipo "checklist",
-- e cada cliente guarda a resposta ATUAL de cada pergunta (contato_respostas). A ficha monta
-- "Informações do cliente" a partir dessas duas tabelas — nada fixo no código.
alter table public.formulario_perguntas
  add column if not exists secao text not null default 'Geral',
  add column if not exists ordem integer not null default 0,
  add column if not exists ajuda text;

alter table public.formulario_perguntas drop constraint if exists formulario_perguntas_tipo_check;
alter table public.formulario_perguntas add constraint formulario_perguntas_tipo_check check (tipo = any (array[
  'texto_curto','texto_longo','numero','data','email','telefone','sim_nao','selecao_unica','selecao_multipla','checklist'
]));

-- Ordem inicial = ordem alfabética atual (não muda nada visível).
update public.formulario_perguntas p set ordem = s.rn
from (select id, row_number() over (order by texto) rn from public.formulario_perguntas) s
where s.id = p.id and p.ordem = 0;

create table if not exists public.contato_respostas (
  contato_id bigint not null references public.contatos(id) on delete cascade,
  pergunta_id bigint not null references public.formulario_perguntas(id) on delete restrict,
  resposta jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (contato_id, pergunta_id)
);
create index if not exists contato_respostas_pergunta_idx on public.contato_respostas(pergunta_id);
alter table public.contato_respostas enable row level security;
drop policy if exists "contato_respostas: equipe" on public.contato_respostas;
create policy "contato_respostas: equipe" on public.contato_respostas for all using (public.is_staff()) with check (public.is_staff());

-- Preserva o que já foi respondido: a resposta mais recente de cada pergunta (casada pelo texto e tipo).
insert into public.contato_respostas (contato_id, pergunta_id, resposta, updated_at)
select distinct on (e.contato_id, p.id) e.contato_id, p.id, r.resposta, coalesce(e.respondido_em, e.created_at)
from public.formulario_envio_respostas r
join public.formulario_envios e on e.id = r.envio_id
join public.formulario_perguntas p on p.texto = r.pergunta_texto and p.tipo = r.pergunta_tipo
where r.resposta is not null
order by e.contato_id, p.id, coalesce(e.respondido_em, e.created_at) desc
on conflict do nothing;
