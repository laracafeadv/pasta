-- Secretária · aba Leads: controle de contatos novos (quadro por etapa), independente das telas de Leads/Clientes do CRM.
-- Etapas: novo → consulta → proposta → fechou | nao_fechou. "Sumiu" não é etapa: é a situação da conversa (aguardando o cliente há mais de 3 dias).
create table if not exists public.secretaria_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\d{10,15}$'),
  origem text not null default 'WhatsApp' check (origem in ('Instagram', 'Indicação', 'Google', 'WhatsApp', 'Outro')),
  origem_detalhe text check (origem_detalhe is null or char_length(origem_detalhe) <= 120),
  area text check (area is null or char_length(area) <= 80),
  cidade text check (cidade is null or char_length(cidade) <= 80),
  data_contato date not null default current_date,
  etapa text not null default 'novo' check (etapa in ('novo', 'consulta', 'proposta', 'fechou', 'nao_fechou')),
  conversa text not null default 'minha' check (conversa in ('minha', 'cliente')),
  conversa_desde timestamptz not null default now(),
  caso text check (caso is null or char_length(caso) <= 2000),
  consulta_data date,
  consulta_hora time,
  consulta_link text check (consulta_link is null or char_length(consulta_link) <= 500),
  honorarios_prop numeric(12, 2) check (honorarios_prop is null or honorarios_prop >= 0),
  valor_fechado numeric(12, 2) check (valor_fechado is null or valor_fechado >= 0),
  exito numeric(5, 2) check (exito is null or (exito >= 0 and exito <= 100)),
  motivo_nao_fechou text check (motivo_nao_fechou is null or char_length(motivo_nao_fechou) <= 300),
  proximo_passo text check (proximo_passo is null or char_length(proximo_passo) <= 300),
  obs text check (obs is null or char_length(obs) <= 2000),
  -- quem não fechou precisa dizer por quê: é o que alimenta o aprendizado com os leads
  check (etapa <> 'nao_fechou' or char_length(btrim(coalesce(motivo_nao_fechou, ''))) > 0)
);
create index if not exists secretaria_leads_etapa_idx on public.secretaria_leads(etapa, data_contato desc);
create index if not exists secretaria_leads_contato_idx on public.secretaria_leads(data_contato desc);
create trigger secretaria_leads_updated_at before update on public.secretaria_leads for each row execute function public.set_updated_at();
alter table public.secretaria_leads enable row level security;
drop policy if exists "secretaria_leads: equipe" on public.secretaria_leads;
create policy "secretaria_leads: equipe" on public.secretaria_leads for all using (public.is_staff()) with check (public.is_staff());
