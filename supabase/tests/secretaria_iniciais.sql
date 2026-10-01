-- SECRETÁRIA (Iniciais) — restrições da tabela secretaria_iniciais. Transação com RAISE EXCEPTION final (rollback).
do $$
declare r text := ''; u uuid; ok boolean; n int;
begin
  select id into u from public.profiles limit 1;
  if u is null then raise exception 'sem perfil para testar'; end if;
  select count(*) into n from pg_tables where schemaname='public' and tablename='secretaria_iniciais' and rowsecurity;
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' 1 RLS ligada' || E'\n';
  select count(*) into n from pg_policies where schemaname='public' and tablename='secretaria_iniciais';
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' 2 uma política (equipe)' || E'\n';
  insert into secretaria_iniciais(user_id, cliente) values (u, 'ZZ Inicial');
  r := r || case when (select etapa||'/'||prioridade||'/'||checklist::text from secretaria_iniciais where cliente='ZZ Inicial') = 'aguardando/normal/[]' then 'PASS' else 'FAIL' end || ' 3 padrões: aguardando, normal, checklist vazio' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, etapa) values (u, 'ZZ a', 'sumiu'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4 etapa fora da lista recusada' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, prioridade) values (u, 'ZZ b', 'urgente'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 5 prioridade inválida recusada' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, prazo_fatal_tipo) values (u, 'ZZ c', 'outra'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 6 tipo de prazo fatal inválido recusado' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, meta_protocolo, prazo_fatal) values (u, 'ZZ d', '2026-12-02', '2026-12-01'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 7 meta depois do prazo fatal recusada' || E'\n';
  insert into secretaria_iniciais(user_id, cliente, meta_protocolo, prazo_fatal) values (u, 'ZZ e', '2026-12-01', '2026-12-01');
  r := r || 'PASS 8 meta no mesmo dia do prazo fatal aceita' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, etapa) values (u, 'ZZ f', 'protocolada'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 9 protocolada sem data recusada' || E'\n';
  insert into secretaria_iniciais(user_id, cliente, etapa, protocolo_data, processo_numero) values (u, 'ZZ g', 'protocolada', '2026-10-01', '0000123-45.2026.8.05.0001');
  r := r || 'PASS 10 protocolada com data e número CNJ aceita' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, processo_numero) values (u, 'ZZ h', '12345'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 11 número fora do formato CNJ recusado' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente, checklist) values (u, 'ZZ i', '{"a":1}'::jsonb); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 12 checklist precisa ser lista' || E'\n';
  ok := false; begin insert into secretaria_iniciais(user_id, cliente) values (u, '   '); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 13 cliente em branco recusado' || E'\n';
  raise exception E'\n%', r;
end $$;
