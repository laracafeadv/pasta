-- Intimações no banco real (com rollback): só processo judicial, coerência com a demanda, tipo e prazo válidos.
do $$
declare r text := ''; c bigint; dj bigint; de bigint; pj bigint; pe bigint; ok boolean; i bigint; comp bigint;
begin
  insert into contatos(nome,telefone,etapa) values ('ZZ Intim','71900000501','ativo') returning id into c;
  insert into casos(contato_id,titulo,tipo) values (c,'Divórcio litigioso','judicial') returning id into dj;
  insert into casos(contato_id,titulo,tipo) values (c,'Inventário extra','extrajudicial') returning id into de;
  insert into processos(caso_id,contato_id,natureza,numero,tribunal) values (dj,c,'judicial','8888888-88.2026.8.05.0001','TJBA') returning id into pj;
  insert into processos(caso_id,contato_id,natureza,tipo_procedimento) values (de,c,'extrajudicial','Inventário extrajudicial (escritura)') returning id into pe;
  insert into compromissos(tipo,titulo,contato_id,caso_id,processo_id,data_publicacao,dias_prazo,data_limite) values ('prazo','Prazo: teste',c,dj,pj,current_date,15,current_date+21) returning id into comp;
  insert into intimacoes(processo_id,caso_id,contato_id,data_publicacao,tipo,conteudo,dias_prazo,compromisso_id) values (pj,dj,c,current_date,'Decisão','teor',15,comp) returning id into i;
  r := r || case when (select status from intimacoes where id=i)='a_tratar' then 'PASS' else 'FAIL' end || ' intimação nasce "a tratar"' || E'\n';
  ok := false; begin insert into intimacoes(processo_id,caso_id,contato_id,data_publicacao,tipo) values (pe,de,c,current_date,'Decisão'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' procedimento extrajudicial não recebe intimação' || E'\n';
  ok := false; begin insert into intimacoes(processo_id,caso_id,contato_id,data_publicacao,tipo) values (pj,de,c,current_date,'Decisão'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' intimação não fica com demanda diferente da do processo' || E'\n';
  ok := false; begin insert into intimacoes(processo_id,caso_id,contato_id,data_publicacao,tipo) values (pj,dj,c,current_date,'Tipo inventado'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' tipo inválido rejeitado' || E'\n';
  ok := false; begin insert into intimacoes(processo_id,caso_id,contato_id,data_publicacao,tipo,dias_prazo) values (pj,dj,c,current_date,'Decisão',0); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' prazo fora de 1–365 rejeitado' || E'\n';
  update intimacoes set status='tratada', tratada_em=now() where id=i;
  r := r || case when (select status from intimacoes where id=i)='tratada' then 'PASS' else 'FAIL' end || ' tratar' || E'\n';
  delete from compromissos where id=comp;
  r := r || case when (select compromisso_id from intimacoes where id=i) is null and exists(select 1 from intimacoes where id=i) then 'PASS' else 'FAIL' end || ' apagar o prazo não apaga a intimação (histórico)' || E'\n';
  delete from processos where id=pj;
  r := r || case when not exists(select 1 from intimacoes where id=i) then 'PASS' else 'FAIL' end || ' apagar o processo leva as intimações dele' || E'\n';
  raise exception E'RESULTADO INTIMAÇÕES (banco)\n%', r;
end $$;
