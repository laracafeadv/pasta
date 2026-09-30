-- SECRETÁRIA (Leads) — restrições da tabela secretaria_leads. Transação com RAISE EXCEPTION final (rollback).
do $$
declare r text := ''; u uuid; ok boolean; n int;
begin
  select id into u from public.profiles limit 1;
  if u is null then raise exception 'sem perfil para testar'; end if;

  select count(*) into n from pg_tables where schemaname='public' and tablename='secretaria_leads' and rowsecurity;
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' 1 RLS ligada' || E'\n';
  select count(*) into n from pg_policies where schemaname='public' and tablename='secretaria_leads';
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' 2 uma política (equipe)' || E'\n';

  insert into secretaria_leads(user_id, nome) values (u, 'ZZ Lead');
  r := r || case when (select etapa||'/'||origem||'/'||conversa from secretaria_leads where nome='ZZ Lead') = 'novo/WhatsApp/minha' then 'PASS' else 'FAIL' end || ' 3 padrões: novo, WhatsApp, aguardando minha resposta' || E'\n';

  ok := false; begin insert into secretaria_leads(user_id, nome, origem) values (u, 'ZZ a', 'TikTok'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4 origem fora da lista recusada' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome, etapa) values (u, 'ZZ b', 'sumiu'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 5 "sumiu" não é etapa' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome, whatsapp) values (u, 'ZZ c', '(71) 9999'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 6 WhatsApp só com dígitos (10–15)' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome, exito) values (u, 'ZZ d', 120); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 7 êxito acima de 100% recusado' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome, valor_fechado) values (u, 'ZZ e', -1); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 8 valor negativo recusado' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome, etapa) values (u, 'ZZ f', 'nao_fechou'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 9 "Não fechou" sem motivo recusado' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome, etapa, motivo_nao_fechou) values (u, 'ZZ g', 'nao_fechou', '   '); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 10 motivo em branco recusado' || E'\n';
  insert into secretaria_leads(user_id, nome, etapa, motivo_nao_fechou) values (u, 'ZZ h', 'nao_fechou', 'Achou caro');
  r := r || 'PASS 11 "Não fechou" com motivo aceito' || E'\n';
  ok := false; begin insert into secretaria_leads(user_id, nome) values (u, '   '); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 12 nome em branco recusado' || E'\n';

  raise exception E'\n%', r;
end $$;
