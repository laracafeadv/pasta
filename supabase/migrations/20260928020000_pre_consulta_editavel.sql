-- Formulário pré-consulta editável: a Dra. escolhe quais perguntas fixas entram
-- e acrescenta quantas perguntas extras quiser, específicas do caso, antes de enviar.
-- Substitui a pergunta extra única por uma lista.

alter table public.contatos
  drop column if exists pre_form_pergunta_extra,
  drop column if exists pre_form_resposta_extra,
  add column if not exists pre_form_campos_ativos  jsonb,
  add column if not exists pre_form_perguntas_extra jsonb,
  add column if not exists pre_form_respostas_extra jsonb;
