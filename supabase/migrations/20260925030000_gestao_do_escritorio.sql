-- =============================================================================
-- CRM Lara Café — migração 4
-- Carteira por classificação (playbook "Classificando seus clientes"),
-- diagnóstico com 5 porquês e viabilidade, Mapa da Empatia (vozes reais),
-- financeiro e qualidade (revisão semanal).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Relacionamento e voz da cliente
-- -----------------------------------------------------------------------------
alter table public.contatos
  add column if not exists classificacao_desde timestamptz,
  add column if not exists ultimo_contato_em   timestamptz,  -- último gesto/contato registrado pela equipe
  add column if not exists obs_relacionamento  text,         -- "observação rápida" da planilha de carteira
  add column if not exists dor                 text,         -- nas palavras da cliente (a Ana registra)
  add column if not exists objetivo            text;         -- o que ela quer que mude (a Ana registra)

update public.contatos set classificacao_desde = updated_at where classificacao is not null and classificacao_desde is null;

create or replace function public.marcar_etapa_desde()
returns trigger language plpgsql as $$
begin
  if new.etapa is distinct from old.etapa then
    new.etapa_desde = now();
  end if;
  -- NPS define a classificação automaticamente (a equipe pode ajustar depois).
  if new.nps is distinct from old.nps and new.nps is not null then
    new.classificacao = case when new.nps >= 9 then 'promotora' when new.nps >= 7 then 'neutra' else 'detratora' end;
  end if;
  -- Guarda desde quando está no grupo: decide "reparar" x "blindar" nas detratoras.
  if new.classificacao is distinct from old.classificacao then
    new.classificacao_desde = case when new.classificacao is null then null else now() end;
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Diagnóstico da consulta: 5 porquês, viabilidade jurídica e financeira
-- -----------------------------------------------------------------------------
create table if not exists public.diagnosticos (
  contato_id            bigint primary key references public.contatos (id) on delete cascade,
  problema_relatado     text,
  porques               jsonb not null default '[]',   -- até 5 respostas, em ordem
  causa_raiz            text,
  objetivo_cliente      text,
  verificacoes          jsonb not null default '{}',   -- { prescricao: true, competencia: false, ... }
  riscos                text,
  capacidade_pagamento  text check (capacidade_pagamento in ('confortavel', 'parcelado', 'restrita', 'nao_informado')),
  valor_em_jogo         numeric(14, 2),
  descricao_em_jogo     text,                          -- ex.: "meação do apartamento", "pensão de 12 meses"
  decisao               text check (decisao in ('viavel', 'ressalvas', 'inviavel')),
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.profiles (id) on delete set null
);
alter table public.diagnosticos enable row level security;
create policy "diagnosticos: equipe" on public.diagnosticos
  for all using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- Tempo gasto por atividade (rentabilidade)
-- -----------------------------------------------------------------------------
alter table public.atividades add column if not exists minutos int check (minutos is null or minutos between 0 and 1440);

-- -----------------------------------------------------------------------------
-- Casos: resultado (taxa de êxito) — data_encerramento já existe
-- -----------------------------------------------------------------------------
alter table public.casos add column if not exists resultado text
  check (resultado in ('exito', 'parcial', 'acordo', 'sem_exito', 'desistencia'));

-- Lembrete automático de prazo: dia em que a equipe foi avisada (evita repetir).
alter table public.compromissos add column if not exists lembrete_em date;

-- -----------------------------------------------------------------------------
-- Financeiro: contas a receber e a pagar (somente administração)
-- -----------------------------------------------------------------------------
create table if not exists public.lancamentos (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  tipo          text not null check (tipo in ('receber', 'pagar')),
  descricao     text not null,
  categoria     text not null default 'Outros',
  valor         numeric(12, 2) not null check (valor > 0),
  vencimento    date not null,
  pago_em       date,
  recorrente    boolean not null default false,       -- despesa fixa mensal (entra no custo operacional)
  contato_id    bigint references public.contatos (id) on delete set null,
  caso_id       bigint references public.casos (id) on delete set null,
  honorario_id  bigint references public.honorarios (id) on delete cascade,
  observacao    text
);
create index if not exists lancamentos_venc_idx on public.lancamentos (vencimento);
create index if not exists lancamentos_caso_idx on public.lancamentos (caso_id);
create trigger lancamentos_updated_at before update on public.lancamentos
  for each row execute function public.set_updated_at();
alter table public.lancamentos enable row level security;
create policy "lancamentos: admin" on public.lancamentos
  for all using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- Qualidade: revisão interna por amostragem
-- -----------------------------------------------------------------------------
create table if not exists public.revisoes (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  caso_id         bigint not null references public.casos (id) on delete cascade,
  revisor_id      uuid references public.profiles (id) on delete set null,
  itens           jsonb not null default '{}',        -- { prazos: 'ok' | 'falha' | 'na', ... }
  aprovado        boolean not null,
  observacao      text,
  plano_acao      text,
  compromisso_id  bigint references public.compromissos (id) on delete set null
);
create index if not exists revisoes_caso_idx on public.revisoes (caso_id, created_at desc);
alter table public.revisoes enable row level security;
create policy "revisoes: equipe" on public.revisoes
  for all using (public.is_staff()) with check (public.is_staff());


-- -----------------------------------------------------------------------------
-- Novos scripts: plano de ação por classificação, triagem x consulta, ancoragem
-- -----------------------------------------------------------------------------
insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('10. Relacionamento', 'Neutra — "lembrei de você" (sem pedir nada)', '/reconexao', $t$Oi, [NOME]! Tudo bem por aí? Lembrei de você hoje, [ALGO ESPECÍFICO DO SEU CASO OU DA NOSSA CONVERSA]. Espero que esteja tudo em paz. Um abraço!$t$, 30),
('10. Relacionamento', 'Neutra — conteúdo só para clientes', '/bastidor', $t$Oi, [NOME]! Preparei um material que estou enviando só para clientes do escritório: [TEMA]. Achei que poderia ser útil pra você. Qualquer dúvida, é só me chamar.$t$, 40),
('10. Relacionamento', 'Fria — retomar contato humano', '/reaquecer', $t$Oi, [NOME], quanto tempo! Passando só pra saber como você está depois de tudo o que resolvemos. Fico feliz em acompanhar sua história. Um abraço!$t$, 50),
('10. Relacionamento', 'Promotora — reconhecimento (sem pedido)', '/reconhecimento', $t$[NOME], queria te agradecer de verdade pela confiança de sempre. Clientes como você fazem o meu trabalho ter ainda mais sentido. Conte comigo, viu? 🤍$t$, 60),
('10. Relacionamento', 'Detratora recente — reparar', '/reparacao', $t$Oi, [NOME]. Estive pensando na sua experiência com o escritório e quero reconhecer que [O QUE ACONTECEU]. Você tem razão em se sentir assim. O que vou fazer: [AÇÃO CONCRETA]. Posso te ligar para conversarmos?$t$, 70),
('1. Primeiras mensagens', 'Aprofundar (por quê?)', '/porque', $t$Entendi, [NOME]. E o que te fez decidir procurar ajuda justamente agora?$t$, 60),
('1. Primeiras mensagens', 'Triagem gratuita x consulta', '/triagem-x-consulta', $t$[NOME], só pra ficar claro como funciona: esta conversa inicial é gratuita e serve para eu entender a sua situação e ver se o escritório pode te ajudar. A análise do seu caso — direitos, riscos, caminhos e estratégia — é feita pela Dra. Lara na consulta estratégica, com tempo e sigilo. Assim você decide com segurança, sem achismo.$t$, 70),
('5. Proposta e contrato', 'Proposta com o que está em jogo', '/proposta-valor', $t$[NOME], pra você visualizar: o que está em jogo no seu caso é [O QUE ESTÁ EM JOGO — ex.: a sua parte do apartamento, cerca de R$ X]. O investimento na condução completa é de R$ [VALOR], [FORMA DE PAGAMENTO]. Além do aspecto financeiro, você ganha segurança jurídica, tranquilidade e alguém cuidando de cada etapa por você. Não existe garantia de resultado — o que eu garanto é técnica, estratégia e acompanhamento do início ao fim.$t$, 25)
on conflict (atalho) do nothing;
