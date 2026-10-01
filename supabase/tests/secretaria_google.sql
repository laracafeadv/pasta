-- SECRETÁRIA (Google) — tabelas da conexão e da marca "Prazo lançado". Transação com RAISE EXCEPTION final (rollback).
do $$
declare r text := ''; u uuid; ok boolean; n int; i bigint;
begin
  select id into u from public.profiles limit 1;
  if u is null then raise exception 'sem perfil para testar'; end if;

  -- tokens do Google: RLS ligada e NENHUMA política (só a chave de serviço do servidor acessa)
  select count(*) into n from pg_tables where schemaname='public' and tablename in ('google_conexoes','google_avisos_cache','avisos_prazos') and rowsecurity;
  r := r || case when n = 3 then 'PASS' else 'FAIL' end || ' 1 RLS ligada nas três tabelas' || E'\n';
  select count(*) into n from pg_policies where schemaname='public' and tablename in ('google_conexoes','google_avisos_cache');
  r := r || case when n = 0 then 'PASS' else 'FAIL' end || ' 2 tokens e cache sem política: inacessíveis ao navegador' || E'\n';
  select count(*) into n from pg_policies where schemaname='public' and tablename = 'avisos_prazos';
  r := r || case when n = 1 then 'PASS' else 'FAIL' end || ' 3 avisos_prazos com uma política (dono da equipe)' || E'\n';

  -- marca "Prazo lançado"
  insert into secretaria_itens(user_id, tipo, titulo, dia) values (u, 'prazo', 'ZZ prazo', current_date + 10) returning id into i;
  insert into avisos_prazos(user_id, thread_id, prazo, dias, modo, ciencia, tribunal, item_id) values (u, 'zzthread1', current_date + 10, 15, 'uteis', current_date, 'tjba', i);
  ok := false; begin insert into avisos_prazos(user_id, thread_id, prazo, dias, modo, ciencia, tribunal) values (u, 'zzthread1', current_date, 5, 'uteis', current_date, 'tjba'); exception when unique_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 4 o mesmo e-mail não recebe dois prazos' || E'\n';
  ok := false; begin insert into avisos_prazos(user_id, thread_id, prazo, dias, modo, ciencia, tribunal) values (u, 'zzthread2', current_date, 0, 'uteis', current_date, 'tjba'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 5 prazo de 0 dia recusado' || E'\n';
  ok := false; begin insert into avisos_prazos(user_id, thread_id, prazo, dias, modo, ciencia, tribunal) values (u, 'zzthread3', current_date, 5, 'outro', current_date, 'tjba'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 6 contagem diferente de úteis/corridos recusada' || E'\n';
  ok := false; begin insert into avisos_prazos(user_id, thread_id, prazo, dias, modo, ciencia, tribunal) values (u, 'zzthread4', current_date, 5, 'uteis', current_date, 'stj'); exception when check_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 7 calendário inválido recusado' || E'\n';
  delete from secretaria_itens where id = i;
  r := r || case when (select count(*) from avisos_prazos where thread_id = 'zzthread1' and item_id is null) = 1 then 'PASS' else 'FAIL' end || ' 8 apagar o prazo da agenda mantém a marca (sem ligação)' || E'\n';

  -- cache e conexão
  insert into google_avisos_cache(user_id, thread_id, versao, dados) values (u, 'zzc1', 'h1', '{"cnj":"x"}'::jsonb);
  ok := false; begin insert into google_avisos_cache(user_id, thread_id, versao) values (u, 'zzc1', 'h2'); exception when unique_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 9 cache: uma linha por usuária e conversa' || E'\n';
  ok := false; begin insert into google_conexoes(user_id, refresh_token_enc) values (u, null); exception when not_null_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 10 conexão exige o token (cifrado)' || E'\n';
  raise exception E'RESULTADO SECRETARIA GOOGLE\n%', r;
end $$;
