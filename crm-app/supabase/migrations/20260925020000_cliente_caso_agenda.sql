-- =============================================================================
-- CRM Lara Café — migração 3
-- Mídia do WhatsApp (áudio, imagem, documento), dados do escritório,
-- qualificação do cliente (dados confidenciais), casos e agenda/prazos.
-- Inspirado no projeto plataforma-adv (clientes, dossiê, máscara de dados).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Mídia recebida no WhatsApp
-- -----------------------------------------------------------------------------
alter table public.mensagens_whatsapp
  add column if not exists midia_path  text,   -- caminho no bucket privado "whatsapp"
  add column if not exists midia_tipo  text,   -- mime type
  add column if not exists midia_nome  text,   -- nome original (documentos)
  add column if not exists transcricao text;   -- texto do áudio (transcrição automática)

-- Bucket PRIVADO: arquivos de clientes só são acessados por link temporário gerado pelo servidor.
insert into storage.buckets (id, name, public)
values ('whatsapp', 'whatsapp', false)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Dados do escritório (usados pela Ana e nas peças)
-- -----------------------------------------------------------------------------
create table if not exists public.escritorio (
  chave       text primary key,
  valor       text not null default '',
  updated_at  timestamptz not null default now()
);
alter table public.escritorio enable row level security;
create policy "escritorio: equipe lê" on public.escritorio for select using (public.is_staff());
-- Escrita somente pelo servidor (admin).

-- -----------------------------------------------------------------------------
-- Qualificação do cliente (dados confidenciais).
-- A equipe vê CPF/RG mascarados; só a administração vê completo (regra no servidor).
-- -----------------------------------------------------------------------------
create table if not exists public.qualificacao (
  contato_id      bigint primary key references public.contatos (id) on delete cascade,
  nome_completo   text,
  cpf             text,
  rg              text,
  orgao_emissor   text,
  nacionalidade   text default 'brasileira',
  estado_civil    text,
  profissao       text,
  endereco        text,
  bairro          text,
  cep             text,
  cidade          text,
  uf              text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null
);
alter table public.qualificacao enable row level security;
-- Sem políticas: acesso só pelo servidor (service role), que aplica a máscara.

-- -----------------------------------------------------------------------------
-- Casos (dossiê)
-- -----------------------------------------------------------------------------
create table if not exists public.casos (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  contato_id       bigint not null references public.contatos (id) on delete cascade,
  titulo           text not null,
  area             text,
  tipo             text not null default 'judicial' check (tipo in ('judicial', 'extrajudicial', 'consultivo')),
  numero_processo  text,
  orgao            text,           -- vara / cartório
  comarca          text,
  uf               text,
  parte_contraria  text,
  status           text not null default 'ativo' check (status in ('ativo', 'suspenso', 'encerrado')),
  data_abertura    date not null default current_date,
  data_encerramento date,
  observacoes      text,
  responsavel_id   uuid references public.profiles (id) on delete set null
);
create index if not exists casos_contato_idx on public.casos (contato_id);
create unique index if not exists casos_processo_idx on public.casos (numero_processo) where numero_processo is not null and numero_processo <> '';
create trigger casos_updated_at before update on public.casos
  for each row execute function public.set_updated_at();
alter table public.casos enable row level security;
create policy "casos: equipe" on public.casos
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Agenda e prazos
-- -----------------------------------------------------------------------------
create table if not exists public.compromissos (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  tipo            text not null default 'tarefa' check (tipo in ('prazo', 'audiencia', 'reuniao', 'consulta', 'tarefa')),
  titulo          text not null,
  contato_id      bigint references public.contatos (id) on delete cascade,
  caso_id         bigint references public.casos (id) on delete cascade,
  inicio          timestamptz,      -- audiência, reunião, consulta
  data_limite     date,             -- prazo processual / tarefa
  data_publicacao date,             -- base do cálculo do prazo
  dias_prazo      int,
  local           text,             -- endereço ou link
  status          text not null default 'pendente' check (status in ('pendente', 'concluido', 'cancelado')),
  observacao      text,
  responsavel_id  uuid references public.profiles (id) on delete set null,
  concluido_em    timestamptz,
  check (inicio is not null or data_limite is not null)
);
create index if not exists compromissos_data_idx on public.compromissos (status, data_limite, inicio);
create trigger compromissos_updated_at before update on public.compromissos
  for each row execute function public.set_updated_at();
alter table public.compromissos enable row level security;
create policy "compromissos: equipe" on public.compromissos
  for all using (public.is_staff()) with check (public.is_staff());

-- A cliente pode mandar áudio: a Ana entende (transcrição) e a equipe ouve no CRM.
update public.modelos_mensagem
   set texto = texto || E'\nSe preferir, pode me mandar um áudio!'
 where atalho in ('/triagem-familia', '/triagem-sucessoes', '/boasvindas')
   and texto not like '%mandar um áudio%';
