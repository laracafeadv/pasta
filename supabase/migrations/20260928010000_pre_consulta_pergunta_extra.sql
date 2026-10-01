-- Pergunta extra por caso: quando gera o link, a Dra. pode acrescentar uma pergunta
-- específica daquele atendimento (o formulário fixo não cobre tudo, cada caso é um caso).

alter table public.contatos
  add column if not exists pre_form_pergunta_extra   text,
  add column if not exists pre_form_resposta_extra    text;
