-- =============================================================================
-- Sugestões de resposta deixadas pela rotina do Claude (sem IA paga no servidor).
-- A rotina lê as conversas sem resposta e grava um rascunho na ficha; quando a
-- advogada responde (pelo CRM ou pelo celular), o rascunho some sozinho.
-- =============================================================================
alter table public.contatos
  add column if not exists sugestao_resposta text,
  add column if not exists sugestao_em       timestamptz;

create or replace function public.limpar_sugestao_ao_responder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.direcao = 'saida' then
    update public.contatos set sugestao_resposta = null, sugestao_em = null
     where id = new.contato_id and sugestao_resposta is not null;
  end if;
  return new;
end $$;

drop trigger if exists mensagens_limpa_sugestao on public.mensagens_whatsapp;
create trigger mensagens_limpa_sugestao after insert on public.mensagens_whatsapp
  for each row execute function public.limpar_sugestao_ao_responder();

-- Conversas que esperam resposta: a última mensagem é da cliente e ainda não há rascunho para ela.
create or replace view public.conversas_sem_resposta as
select c.id, c.nome, c.telefone, c.etapa, c.area, c.demanda, c.resumo, c.dor, c.objetivo, c.nao_contatar,
       u.created_at as ultima_em
from public.contatos c
join lateral (
  select m.direcao, m.created_at from public.mensagens_whatsapp m
   where m.contato_id = c.id order by m.created_at desc, m.id desc limit 1
) u on true
where u.direcao = 'entrada'
  and c.nao_contatar = false
  and (c.sugestao_em is null or c.sugestao_em < u.created_at);

revoke all on public.conversas_sem_resposta from anon, authenticated;
