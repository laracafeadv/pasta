-- Formulário pré-consulta: enviado ao confirmar a consulta paga, antes do encontro,
-- para a Dra. já chegar com contexto. Reaproveita os campos que a ficha já tem
-- (area, resumo, dor, objetivo, urgencia) e só acrescenta o que falta.

alter table public.contatos
  add column if not exists pre_form_token          text unique,
  add column if not exists pre_form_expira         timestamptz,
  add column if not exists pre_form_respondido_em  timestamptz,
  add column if not exists processo_em_andamento   boolean;

insert into public.modelos_mensagem (categoria, titulo, atalho, texto, ordem) values
('2. Agendamento', 'Formulário pré-consulta', '/pre-consulta', $t$[NOME], para eu já chegar preparada na nossa consulta, preparei um formulário rápido (uns 2 minutos) para entender melhor a sua situação:
[LINK DO FORMULÁRIO]
Assim a gente aproveita melhor o nosso tempo juntas. Até lá! 🤍$t$, 15)
on conflict (atalho) do nothing;
