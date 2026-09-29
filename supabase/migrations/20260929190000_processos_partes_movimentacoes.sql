-- Arquitetura: Cliente → Demanda (casos) → Processo/Procedimento (judicial OU extrajudicial, 0..N) → Movimentações,
-- com Partes/Interessados por demanda. A demanda não precisa ter processo (consultiva/documental).
-- As colunas de processo antigas em casos NÃO são apagadas (histórico); a partir daqui a fonte é a tabela processos.

create table if not exists public.processos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  caso_id bigint not null references public.casos(id) on delete cascade,
  contato_id bigint not null references public.contatos(id) on delete cascade,
  natureza text not null check (natureza in ('judicial', 'extrajudicial')),
  numero text,                -- CNJ (judicial) ou protocolo/livro-folha (extrajudicial)
  orgao text,                 -- vara/juízo (judicial) ou cartório/serventia (extrajudicial)
  comarca text,
  uf text,
  fase text,
  status text not null default 'ativo' check (status in ('ativo', 'suspenso', 'encerrado')),
  valor numeric,              -- valor da causa / do ato
  link text,
  data_inicio date not null default current_date,
  data_encerramento date,
  observacoes text,
  responsavel_id uuid references auth.users(id) on delete set null
);
create unique index if not exists processos_numero_judicial_uq on public.processos(numero) where natureza = 'judicial' and numero is not null;
create index if not exists processos_caso_idx on public.processos(caso_id);
create index if not exists processos_contato_idx on public.processos(contato_id);

create table if not exists public.partes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  caso_id bigint not null references public.casos(id) on delete cascade,
  contato_id bigint references public.contatos(id) on delete set null, -- se a pessoa também está cadastrada
  nome text not null,
  papel text not null default 'Interessado',
  documento text,
  telefone text,
  email text,
  observacao text
);
create index if not exists partes_caso_idx on public.partes(caso_id);
create index if not exists partes_nome_idx on public.partes(lower(nome));

create table if not exists public.movimentacoes (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  processo_id bigint not null references public.processos(id) on delete cascade,
  data date not null default current_date,
  tipo text not null default 'Andamento',
  texto text not null,
  autor_id uuid references auth.users(id) on delete set null
);
create index if not exists movimentacoes_processo_idx on public.movimentacoes(processo_id, data desc);

alter table public.processos enable row level security;
alter table public.partes enable row level security;
alter table public.movimentacoes enable row level security;
drop policy if exists "processos: equipe" on public.processos;
drop policy if exists "partes: equipe" on public.partes;
drop policy if exists "movimentacoes: equipe" on public.movimentacoes;
create policy "processos: equipe" on public.processos for all using (public.is_staff()) with check (public.is_staff());
create policy "partes: equipe" on public.partes for all using (public.is_staff()) with check (public.is_staff());
create policy "movimentacoes: equipe" on public.movimentacoes for all using (public.is_staff()) with check (public.is_staff());

-- Prazos e compromissos podem apontar para o processo específico (opcional).
alter table public.compromissos add column if not exists processo_id bigint references public.processos(id) on delete set null;
create index if not exists compromissos_processo_idx on public.compromissos(processo_id);

-- Migração dos dados existentes: cada demanda judicial, ou com dado de processo, ganha o seu processo/procedimento.
insert into public.processos (caso_id, contato_id, natureza, numero, orgao, comarca, uf, fase, status, valor, link, data_inicio, data_encerramento, responsavel_id)
select c.id, c.contato_id,
       case when c.tipo = 'judicial' or c.numero_processo is not null then 'judicial' else 'extrajudicial' end,
       c.numero_processo, c.orgao, c.comarca, c.uf, c.fase_processual, c.status, c.valor_causa, c.link_tribunal,
       coalesce(c.data_abertura, current_date), c.data_encerramento, c.responsavel_id
from public.casos c
where (c.tipo = 'judicial' or c.numero_processo is not null or c.orgao is not null or c.comarca is not null or c.fase_processual is not null)
  and not exists (select 1 from public.processos p where p.caso_id = c.id);

-- Parte contrária de cada demanda vira uma parte.
insert into public.partes (caso_id, nome, papel)
select c.id, c.parte_contraria, case when c.tipo = 'judicial' then 'Parte contrária' else 'Outra parte' end
from public.casos c
where nullif(trim(c.parte_contraria), '') is not null
  and not exists (select 1 from public.partes p where p.caso_id = c.id and lower(p.nome) = lower(c.parte_contraria));
