-- Formulário por link público individual (cliente + demanda + formulário), com estrutura congelada por versão.
-- Aditiva: nada é apagado e os envios/respostas existentes continuam valendo (link /pc/<token> segue funcionando).

-- 1) Formulário: situação (rascunho/publicado/arquivado), versão, instruções, finalidade e mensagem final
alter table public.formularios
  add column if not exists situacao text not null default 'publicado' check (situacao in ('rascunho', 'publicado', 'arquivado')),
  add column if not exists versao int not null default 1,
  add column if not exists instrucoes text,
  add column if not exists finalidade text,
  add column if not exists mensagem_final text;
update public.formularios set situacao = 'arquivado' where ativo = false and situacao = 'publicado';

-- "ativo" (código antigo) e "situacao" andam juntos
create or replace function public.sincronizar_situacao_formulario() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.ativo is distinct from (new.situacao = 'publicado') then
      if new.situacao = 'publicado' and new.ativo = false then new.situacao := 'arquivado'; else new.ativo := (new.situacao = 'publicado'); end if;
    end if;
  elsif new.situacao is distinct from old.situacao then
    new.ativo := (new.situacao = 'publicado');
  elsif new.ativo is distinct from old.ativo then
    new.situacao := case when new.ativo then 'publicado' else 'arquivado' end;
  end if;
  return new;
end $$;
drop trigger if exists trg_situacao_formulario on public.formularios;
create trigger trg_situacao_formulario before insert or update on public.formularios
  for each row execute function public.sincronizar_situacao_formulario();

-- 2) Envio = link individual. Agora também liga à DEMANDA e guarda a estrutura congelada (versão) enviada à cliente.
alter table public.formulario_envios
  add column if not exists caso_id bigint references public.casos (id) on delete set null,
  add column if not exists prazo_resposta date,
  add column if not exists versao_formulario int,
  add column if not exists estrutura jsonb,
  add column if not exists enviado_em timestamptz,
  add column if not exists canal_envio text check (canal_envio in ('whatsapp', 'email', 'manual')),
  add column if not exists iniciado_em timestamptz,
  add column if not exists consentimento_em timestamptz,
  add column if not exists respondente text,
  add column if not exists cancelado_em timestamptz,
  add column if not exists gerado_por uuid references public.profiles (id) on delete set null;
comment on column public.formulario_envios.estrutura is 'Seções/perguntas (com opções) exatamente como a cliente viu; a validação e o histórico usam ESTA cópia, não o formulário atual.';

alter table public.formulario_envios drop constraint if exists formulario_envios_status_check;
alter table public.formulario_envios add constraint formulario_envios_status_check
  check (status in ('gerado', 'enviado', 'visualizado', 'iniciado', 'respondido', 'cancelado'));
alter table public.formulario_envios alter column status set default 'gerado';
create index if not exists formulario_envios_caso_idx on public.formulario_envios (caso_id, created_at desc);
create index if not exists formulario_envios_pendentes_idx on public.formulario_envios (status, expira_em) where respondido_em is null;

-- 3) Resposta guarda a pergunta como ela era (texto, tipo e opções) — editar o formulário depois não altera o que foi respondido
alter table public.formulario_envio_respostas
  add column if not exists pergunta_opcoes jsonb,
  add column if not exists pergunta_versao int;
