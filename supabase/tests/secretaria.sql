-- SECRETÁRIA — restrições das tabelas novas. Transação com RAISE EXCEPTION final (rollback): nada é gravado.
do $$
declare r text := ''; u uuid; ok boolean; n int; c bigint; l bigint;
begin
  select id into u from public.profiles limit 1;
  if u is null then raise exception 'sem perfil para testar'; end if;

  -- lembrete: texto vazio e texto longo recusados; válido entra
  ok := false; begin insert into lembretes_rapidos(user_id, texto) values (u, '   '); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 1 lembrete vazio recusado' || E'\n';
  ok := false; begin insert into lembretes_rapidos(user_id, texto) values (u, repeat('x', 301)); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 2 lembrete com mais de 300 caracteres recusado' || E'\n';
  insert into lembretes_rapidos(user_id, texto, data, hora) values (u, 'Ligar ao cartório', current_date, '10:00') returning id into l;
  r := r || case when (select feito from lembretes_rapidos where id = l) = false then 'PASS' else 'FAIL' end || ' 3 lembrete nasce pendente' || E'\n';

  -- itens da agenda própria
  ok := false; begin insert into secretaria_itens(user_id, tipo, titulo, dia) values (u, 'reuniao', 'x', current_date); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4a tipo de item inválido recusado' || E'\n';
  ok := false; begin insert into secretaria_itens(user_id, tipo, titulo, dia) values (u, 'prazo', '  ', current_date); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4b título vazio recusado' || E'\n';
  ok := false; begin insert into secretaria_itens(user_id, tipo, titulo, dia, dias_prazo) values (u, 'prazo', 'x', current_date, 400); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4c prazo acima de 365 dias recusado' || E'\n';
  ok := false; begin insert into secretaria_itens(user_id, tipo, titulo, dia, tribunal) values (u, 'prazo', 'x', current_date, 'stj'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4d tribunal inválido recusado' || E'\n';
  insert into secretaria_itens(user_id, tipo, titulo, dia, hora, dias_prazo, data_intimacao, tribunal) values (u, 'prazo', 'ZZ Réplica', current_date + 3, null, 15, current_date, 'tjba') returning id into c;
  r := r || case when (select feito from secretaria_itens where id = c) = false then 'PASS' else 'FAIL' end || ' 4e item nasce em aberto' || E'\n';
  -- lembrete ligado ao item: apagar o item não apaga o lembrete
  update lembretes_rapidos set item_id = c where id = l;
  delete from secretaria_itens where id = c;
  r := r || case when (select count(*) from lembretes_rapidos where id = l and item_id is null) = 1 then 'PASS' else 'FAIL' end || ' 4f apagar o item preserva o lembrete' || E'\n';
  select count(*) into n from information_schema.columns where table_name = 'lembretes_rapidos' and column_name = 'compromisso_id';
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' 4g lembrete não aponta mais para o CRM' || E'\n';

  -- suspensões
  ok := false; begin insert into suspensoes_expediente(de, ate, tribunal) values ('2026-10-10', '2026-10-09', 'todos'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 5 suspensão com fim antes do início recusada' || E'\n';
  ok := false; begin insert into suspensoes_expediente(de, ate, tribunal) values ('2026-10-01', '2026-12-31', 'todos'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 6 suspensão acima de 60 dias recusada' || E'\n';
  ok := false; begin insert into suspensoes_expediente(de, ate, tribunal) values ('2026-10-01', '2026-10-01', 'stj'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 7 tribunal inválido recusado' || E'\n';
  insert into suspensoes_expediente(de, ate, tribunal, motivo) values ('2026-10-15', '2026-10-15', 'tjba', 'instabilidade');
  r := r || case when (select count(*) from suspensoes_expediente where tribunal = 'tjba') >= 1 then 'PASS' else 'FAIL' end || ' 8 suspensão válida entra' || E'\n';

  -- configuração
  insert into secretaria_config(user_id) values (u) on conflict (user_id) do nothing;
  r := r || case when (select tribunal from secretaria_config where user_id = u) in ('tjba','trt5','jf','nac') then 'PASS' else 'FAIL' end || ' 9 configuração com tribunal padrão válido' || E'\n';
  ok := false; begin update secretaria_config set atalhos = '{"a":1}'::jsonb where user_id = u; exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 10 atalhos que não são lista recusados' || E'\n';
  ok := false; begin update secretaria_config set tribunal = 'stj' where user_id = u; exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 11 tribunal padrão inválido recusado' || E'\n';

  -- RLS ligada nas três tabelas
  select count(*) into n from pg_tables where schemaname = 'public' and tablename in ('lembretes_rapidos','suspensoes_expediente','secretaria_config','secretaria_itens') and rowsecurity;
  r := r || case when n = 4 then 'PASS' else 'FAIL' end || ' 12 RLS ligada nas quatro tabelas' || E'\n';
  raise exception E'RESULTADO SECRETARIA\n%', r;
end $$;
