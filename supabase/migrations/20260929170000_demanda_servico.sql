-- Demanda/serviço: o "caso" passa a ser a demanda contratada (consultiva, extrajudicial ou judicial);
-- os dados de processo só existem quando há processo. A tabela continua chamando-se casos (FKs preservadas).

-- Honorário pertence a uma demanda (opcional): com duas contratações, dá para saber qual valor é de qual.
alter table public.honorarios add column if not exists caso_id bigint references public.casos(id) on delete set null;
create index if not exists honorarios_caso_id_idx on public.honorarios(caso_id);
-- Quem tem uma única demanda: o honorário é dela (nada muda para o que já existe).
update public.honorarios h set caso_id = c.id
from (select contato_id, min(id) id from public.casos group by contato_id having count(*) = 1) c
where c.contato_id = h.contato_id and h.caso_id is null;

-- Perguntas do construtor: valem para o cliente (permanente) ou para cada demanda; opcionalmente só para certos procedimentos.
alter table public.formulario_perguntas
  add column if not exists escopo text not null default 'cliente' check (escopo in ('cliente', 'demanda')),
  add column if not exists procedimentos text[] not null default '{}';

-- Respostas por demanda (as do cliente continuam em contato_respostas).
create table if not exists public.caso_respostas (
  caso_id bigint not null references public.casos(id) on delete cascade,
  pergunta_id bigint not null references public.formulario_perguntas(id) on delete restrict,
  resposta jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (caso_id, pergunta_id)
);
create index if not exists caso_respostas_pergunta_idx on public.caso_respostas(pergunta_id);
alter table public.caso_respostas enable row level security;
drop policy if exists "caso_respostas: equipe" on public.caso_respostas;
create policy "caso_respostas: equipe" on public.caso_respostas for all using (public.is_staff()) with check (public.is_staff());
