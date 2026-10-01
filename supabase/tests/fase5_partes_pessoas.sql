-- FASE 5 — partes e pessoas. Transação com RAISE EXCEPTION final (rollback): nada é gravado.
do $$
declare
  r text := ''; a bigint; b bigint; c bigint; d1 bigint; d2 bigint; p1 bigint; p2 bigint; pt bigint; ok boolean;
begin
  insert into contatos(nome, telefone, etapa) values ('ZZ Pessoa A','71900005001','ativo') returning id into a;
  insert into contatos(nome, telefone, etapa) values ('ZZ Herdeiro Existente','71900005002','relacionado') returning id into b;
  insert into contatos(nome, telefone, etapa) values ('ZZ Outro Cliente','71900005003','ativo') returning id into c;
  insert into casos(contato_id,titulo,tipo) values (a,'ZZ Inventário','extrajudicial') returning id into d1;
  insert into casos(contato_id,titulo,tipo) values (c,'ZZ Outra','extrajudicial') returning id into d2;
  insert into processos(caso_id,contato_id,natureza) values (d1,a,'extrajudicial') returning id into p1;
  insert into processos(caso_id,contato_id,natureza) values (d2,c,'extrajudicial') returning id into p2;

  -- 1) herdeiro existente vinculado sem criar pessoa
  insert into partes(caso_id,nome,contato_id,papel) values (d1,'ZZ Herdeiro Existente',b,'Herdeiro') returning id into pt;
  r := r || case when (select count(*) from contatos where telefone='71900005002')=1 and (select contato_id from partes where id=pt)=b then 'PASS' else 'FAIL' end || ' 1 herdeiro existente vinculado ao mesmo registro' || E'\n';

  -- 2) mesma pessoa duas vezes na mesma demanda é barrada pelo banco
  ok := false;
  begin insert into partes(caso_id,nome,contato_id,papel) values (d1,'ZZ Herdeiro Existente',b,'Cônjuge'); exception when unique_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 2 mesma pessoa duas vezes na demanda rejeitada (índice único)' || E'\n';

  -- 3) mesma pessoa em outra demanda é permitida
  insert into partes(caso_id,nome,contato_id,papel) values (d2,'ZZ Herdeiro Existente',b,'Interessado');
  r := r || case when (select count(*) from partes where contato_id=b)=2 then 'PASS' else 'FAIL' end || ' 3 mesma pessoa em outra demanda permitida' || E'\n';

  -- 4) partes sem cadastro podem repetir (contato_id nulo)
  insert into partes(caso_id,nome,papel) values (d1,'ZZ Digitada 1','Herdeiro');
  insert into partes(caso_id,nome,papel) values (d1,'ZZ Digitada 2','Herdeiro');
  r := r || case when (select count(*) from partes where caso_id=d1 and contato_id is null)=2 then 'PASS' else 'FAIL' end || ' 4 partes sem cadastro coexistem' || E'\n';

  -- 5) processo da mesma demanda aceito; de outra demanda recusado
  update partes set processo_id=p1 where id=pt;
  ok := false;
  begin update partes set processo_id=p2 where id=pt; exception when others then ok := true; end;
  r := r || case when ok and (select processo_id from partes where id=pt)=p1 then 'PASS' else 'FAIL' end || ' 5 processo só da própria demanda' || E'\n';

  -- 6) apagar a pessoa não apaga a parte (contato_id vira nulo, nome fica)
  delete from contatos where id=b;
  r := r || case when (select count(*) from partes where id=pt and contato_id is null and nome='ZZ Herdeiro Existente')=1 then 'PASS' else 'FAIL' end || ' 6 apagar a pessoa preserva a parte (sem cadastro)' || E'\n';

  -- 7) apagar o processo preserva a parte
  delete from processos where id=p1;
  r := r || case when (select count(*) from partes where id=pt and processo_id is null)=1 then 'PASS' else 'FAIL' end || ' 7 apagar o processo preserva a parte' || E'\n';

  -- 8) telefone único no cadastro
  ok := false;
  begin insert into contatos(nome, telefone, etapa) values ('ZZ Dup','71900005001','relacionado'); exception when unique_violation then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' 8 telefone repetido rejeitado no cadastro de pessoas' || E'\n';

  raise exception E'RESULTADO FASE5\n%', r;
end $$;
