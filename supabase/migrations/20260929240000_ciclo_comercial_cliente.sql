-- FASE 2 — ciclo comercial. Lead e cliente são a MESMA pessoa (contatos.etapa).
-- Regra no banco: quem já é cliente (ativo/concluído) não volta ao funil (lead) nem vira "não contratou";
-- um novo serviço = nova demanda (com a sua própria proposta), nunca uma nova etapa de funil.
create or replace function public.proteger_ciclo_do_cliente() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.etapa in ('ativo', 'concluido')
     and new.etapa in ('novo', 'qualificacao', 'agendado', 'diagnostico', 'proposta', 'perdido', 'relacionado') then
    raise exception 'Cliente não volta ao funil (%→%): abra uma nova demanda.', old.etapa, new.etapa using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists trg_ciclo_cliente on public.contatos;
create trigger trg_ciclo_cliente before update of etapa on public.contatos
  for each row when (old.etapa is distinct from new.etapa) execute function public.proteger_ciclo_do_cliente();

comment on function public.proteger_ciclo_do_cliente() is 'Cliente (ativo/concluido) não retorna a etapas de lead; novo serviço = nova demanda.';
