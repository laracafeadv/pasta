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

  -- lembrete vinculado a compromisso: apagar o compromisso não apaga o lembrete
  insert into compromissos(tipo, titulo, data_limite) values ('reuniao', 'ZZ teste', current_date + 1) returning id into c;
  update lembretes_rapidos set compromisso_id = c where id = l;
  delete from compromissos where id = c;
  r := r || case when (select count(*) from lembretes_rapidos where id = l and compromisso_id is null) = 1 then 'PASS' else 'FAIL' end || ' 4 apagar o compromisso preserva o lembrete' || E'\n';

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
  select count(*) into n from pg_tables where schemaname = 'public' and tablename in ('lembretes_rapidos','suspensoes_expediente','secretaria_config') and rowsecurity;
  r := r || case when n = 3 then 'PASS' else 'FAIL' end || ' 12 RLS ligada nas três tabelas' || E'\n';
  raise exception E'RESULTADO SECRETARIA\n%', r;
end $$;
