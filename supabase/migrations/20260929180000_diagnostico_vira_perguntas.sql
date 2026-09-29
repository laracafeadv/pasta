-- "Diagnóstico" deixa de ser uma aba com campos fixos: vira a seção "Análise da consulta" do construtor
-- (perguntas da DEMANDA, editáveis/excluíveis por você). A tabela diagnosticos é preservada (nada é apagado).

-- 1) Documentos passam a poder pertencer a uma demanda.
alter table public.documentos add column if not exists caso_id bigint references public.casos(id) on delete cascade;
create index if not exists documentos_caso_id_idx on public.documentos(caso_id);
update public.documentos d set caso_id = c.id
from (select contato_id, min(id) id from public.casos group by contato_id having count(*) = 1) c
where c.contato_id = d.contato_id and d.caso_id is null;

-- 2) Perguntas da análise da consulta (só se ainda não existirem).
do $$
declare base int; ids bigint[];
begin
  if exists (select 1 from public.formulario_perguntas where secao = 'Análise da consulta') then return; end if;
  select coalesce(max(ordem), 0) into base from public.formulario_perguntas;
  insert into public.formulario_perguntas (texto, tipo, opcoes, secao, escopo, ordem, ajuda) values
    ('O que o cliente trouxe', 'texto_longo', '[]', 'Análise da consulta', 'demanda', base + 1, 'Com as palavras dele(a).'),
    ('Causa raiz (5 porquês)', 'texto_longo', '[]', 'Análise da consulta', 'demanda', base + 2, 'Pergunte "por quê" até chegar no motivo real; um por linha.'),
    ('O que o cliente quer que mude', 'texto_longo', '[]', 'Análise da consulta', 'demanda', base + 3, null),
    ('Viabilidade — verificações feitas', 'checklist', '["Está na área de atuação do escritório","Prescrição e decadência verificadas","Foro/competência e via (judicial ou cartório) definidos","Legitimidade das partes confirmada","Provas e documentos suficientes (ou obtêníveis)","Sem conflito de interesses","Expectativa do cliente é realista e foi alinhada","Falei com quem decide (e sobre quem paga)"]', 'Análise da consulta', 'demanda', base + 4, 'Marque o que já foi checado antes de propor.'),
    ('Riscos e ressalvas', 'texto_longo', '[]', 'Análise da consulta', 'demanda', base + 5, 'Vão por escrito na proposta.'),
    ('Capacidade de pagamento', 'selecao_unica', '["Paga à vista ou em poucas parcelas","Precisa de parcelamento","Condição restrita (avaliar gratuidade/indicar Defensoria)","Ainda não sei"]', 'Análise da consulta', 'demanda', base + 6, null),
    ('O que está em jogo', 'texto_curto', '[]', 'Análise da consulta', 'demanda', base + 7, 'Ex.: a meação do apartamento; 12 meses de pensão.'),
    ('Valor aproximado em jogo (R$)', 'numero', '[]', 'Análise da consulta', 'demanda', base + 8, null),
    ('Decisão da consulta', 'selecao_unica', '["Viável","Viável com ressalvas","Não viável"]', 'Análise da consulta', 'demanda', base + 9, null);
end $$;

-- 3) Migra o diagnóstico existente: cada cliente com análise ganha (se não tiver) uma demanda consultiva "Consulta"
--    para abrigar as respostas, e as respostas vão para a demanda.
insert into public.casos (contato_id, titulo, area, tipo, status)
select d.contato_id, 'Consulta — ' || coalesce(nullif(c.demanda, ''), nullif(c.area, ''), 'análise inicial'), c.area, 'consultivo', 'ativo'
from public.diagnosticos d join public.contatos c on c.id = d.contato_id
where not exists (select 1 from public.casos k where k.contato_id = d.contato_id);

insert into public.caso_respostas (caso_id, pergunta_id, resposta, updated_at, updated_by)
select k.id, p.id, r.valor, coalesce(d.updated_at, now()), d.updated_by
from public.diagnosticos d
join lateral (select id from public.casos where contato_id = d.contato_id order by created_at desc limit 1) k on true
join public.formulario_perguntas p on p.secao = 'Análise da consulta'
join lateral (select case p.texto
    when 'O que o cliente trouxe' then to_jsonb(nullif(d.problema_relatado, ''))
    when 'Causa raiz (5 porquês)' then to_jsonb(nullif(concat_ws(E'\n', (select string_agg(x, E'\n') from jsonb_array_elements_text(coalesce(d.porques, '[]'::jsonb)) x), nullif(d.causa_raiz, '')), ''))
    when 'O que o cliente quer que mude' then to_jsonb(nullif(d.objetivo_cliente, ''))
    when 'Viabilidade — verificações feitas' then (select nullif(jsonb_agg(rot), '[]'::jsonb) from (values
        ('area','Está na área de atuação do escritório'),('prescricao','Prescrição e decadência verificadas'),
        ('competencia','Foro/competência e via (judicial ou cartório) definidos'),('legitimidade','Legitimidade das partes confirmada'),
        ('provas','Provas e documentos suficientes (ou obtêníveis)'),('conflito','Sem conflito de interesses'),
        ('expectativa','Expectativa do cliente é realista e foi alinhada'),('decisora','Falei com quem decide (e sobre quem paga)')
      ) v(chave, rot) where (d.verificacoes ->> v.chave)::boolean is true)
    when 'Riscos e ressalvas' then to_jsonb(nullif(d.riscos, ''))
    when 'Capacidade de pagamento' then to_jsonb(case d.capacidade_pagamento
        when 'confortavel' then 'Paga à vista ou em poucas parcelas' when 'parcelado' then 'Precisa de parcelamento'
        when 'restrita' then 'Condição restrita (avaliar gratuidade/indicar Defensoria)' when 'nao_informado' then 'Ainda não sei' end)
    when 'O que está em jogo' then to_jsonb(nullif(d.descricao_em_jogo, ''))
    when 'Valor aproximado em jogo (R$)' then to_jsonb(d.valor_em_jogo::text)
    when 'Decisão da consulta' then to_jsonb(case d.decisao when 'viavel' then 'Viável' when 'ressalvas' then 'Viável com ressalvas' when 'inviavel' then 'Não viável' end)
  end valor) r on true
where r.valor is not null and r.valor <> 'null'::jsonb
on conflict do nothing;
