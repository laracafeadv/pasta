-- FASE 1 — modelo conceitual. Roda numa transação e termina SEMPRE com RAISE EXCEPTION
-- (rollback automático): a mensagem final lista os cenários (PASS/FAIL). Nada é gravado.
do $$
declare
  r text := ''; c1 bigint; c2 bigint; d1 bigint; d2 bigint; d3 bigint; p1 bigint; p2 bigint;
  n int; ok boolean;
begin
  -- 1) pessoa como lead
  insert into contatos(nome, telefone, etapa) values ('ZZ Teste Fase1','71900000001','novo') returning id into c1;
  r := r || case when (select etapa from contatos where id=c1)='novo' then 'PASS' else 'FAIL' end || ' 1 pessoa como lead' || E'\n';

  -- 2) a MESMA pessoa vira cliente (mesmo id, etapa muda)
  update contatos set etapa='ativo' where id=c1;
  r := r || case when (select count(*) from contatos where id=c1 and etapa='ativo')=1
                  and (select count(*) from contatos where telefone='71900000001')=1 then 'PASS' else 'FAIL' end || ' 2 mesma pessoa virou cliente' || E'\n';

  -- 3) várias demandas; 6) sem duplicar pessoa
  insert into casos(contato_id,titulo,tipo) values (c1,'Pacto antenupcial','consultivo') returning id into d1;
  insert into casos(contato_id,titulo,tipo) values (c1,'Divórcio','judicial') returning id into d2;
  insert into casos(contato_id,titulo,tipo) values (c1,'Inventário','extrajudicial') returning id into d3;
  r := r || case when (select count(*) from casos where contato_id=c1)=3 then 'PASS' else 'FAIL' end || ' 3 várias demandas na mesma pessoa' || E'\n';
  r := r || case when (select count(*) from contatos where telefone='71900000001')=1 then 'PASS' else 'FAIL' end || ' 6 nova demanda não duplicou a pessoa' || E'\n';

  -- 4) demanda sem processo
  r := r || case when (select count(*) from processos where caso_id=d1)=0 and exists(select 1 from casos where id=d1) then 'PASS' else 'FAIL' end || ' 4 demanda sem processo' || E'\n';

  -- 5) e 7) demanda com processo / procedimento ligados à demanda certa
  insert into processos(caso_id,contato_id,natureza,numero) values (d2,c1,'judicial','0000001-00.2026.8.05.0001') returning id into p1;
  insert into processos(caso_id,contato_id,natureza,numero) values (d3,c1,'extrajudicial','PROTO-1') returning id into p2;
  r := r || case when (select caso_id from processos where id=p1)=d2 and (select caso_id from processos where id=p2)=d3
                  and (select count(*) from processos where caso_id=d1)=0 then 'PASS' else 'FAIL' end || ' 5/7 processo e procedimento ligados à demanda correta' || E'\n';

  -- T1 demanda de outra pessoa é rejeitada
  insert into contatos(nome, telefone, etapa) values ('ZZ Outro','71900000002','ativo') returning id into c2;
  ok := false;
  begin insert into processos(caso_id,contato_id,natureza) values (d1,c2,'judicial'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' T1 processo com demanda de outra pessoa rejeitado' || E'\n';

  -- T2 contato_id herdado da demanda
  insert into tarefas_internas(titulo,caso_id) values ('ZZ tarefa',d2);
  r := r || case when (select contato_id from tarefas_internas where titulo='ZZ tarefa')=c1 then 'PASS' else 'FAIL' end || ' T2 tarefa herda a pessoa da demanda' || E'\n';

  -- T3 documento com processo de outra demanda rejeitado
  ok := false;
  begin insert into documentos(contato_id,caso_id,processo_id,descricao) values (c1,d1,p1,'ZZ doc'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' T3 documento com processo de outra demanda rejeitado' || E'\n';

  -- T4 campos legados de casos bloqueados
  ok := false;
  begin update casos set numero_processo='123' where id=d2; exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' T4 coluna legada numero_processo bloqueada' || E'\n';

  -- T5 parte que é pessoa cadastrada (relacionado) sem duplicar
  insert into contatos(nome, telefone, etapa) values ('ZZ Parte','71900000003','relacionado') returning id into c2;
  insert into partes(caso_id,nome,contato_id,papel) values (d2,'ZZ Parte',c2,'parte_contraria');
  r := r || case when (select count(*) from contatos where nome like 'ZZ Parte%')=1 and (select etapa from contatos where id=c2)='relacionado' then 'PASS' else 'FAIL' end || ' T5 parte aponta para pessoa cadastrada (etapa relacionado)' || E'\n';

  -- T6 apagar demanda leva processos e partes; pessoa permanece
  delete from casos where id=d2;
  r := r || case when (select count(*) from processos where id=p1)=0 and (select count(*) from partes where caso_id=d2)=0
                  and exists(select 1 from contatos where id=c1) then 'PASS' else 'FAIL' end || ' T6 apagar demanda leva processo/partes e preserva a pessoa' || E'\n';

  raise exception E'RESULTADO FASE1\n%', r;
end $$;
