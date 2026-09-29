-- FASE 3 — Demanda/Serviço no banco: cenários pacto antenupcial, inventário e divórcio para a MESMA pessoa (com rollback).
do $$
declare r text := ''; c bigint; dp bigint; di bigint; dd bigint; pr bigint; ok boolean; n int; q1 bigint; q2 bigint;
begin
  r := r || case when (select count(*) from casos where responsavel_id is null)=0 then 'PASS' else 'FAIL' end || ' toda demanda tem responsável' || E'\n';
  r := r || case when exists(select 1 from formularios where nome='Dados da consulta' and contexto='demanda') and not exists(select 1 from formularios where nome='Análise da consulta') then 'PASS' else 'FAIL' end || ' antigo "Análise da consulta" agora é "Dados da consulta" (dados coletados ≠ análise profissional)' || E'\n';
  insert into contatos(nome,telefone,etapa) values ('ZZ Maria','71900000301','ativo') returning id into c;
  insert into casos(contato_id,titulo,tipo,procedimento,responsavel_id,analise,fatos,estrategia,conclusao,riscos,decisao)
    values (c,'Pacto antenupcial','documental','pacto-antenupcial/padrao',(select id from profiles limit 1),'fund','fatos','estr','concl','risc','viavel') returning id into dp;
  insert into casos(contato_id,titulo,tipo,procedimento,responsavel_id) values (c,'Inventário','judicial','inventario/padrao',(select id from profiles limit 1)) returning id into di;
  insert into casos(contato_id,titulo,tipo,procedimento,responsavel_id) values (c,'Divórcio','extrajudicial','divorcio/extrajudicial',(select id from profiles limit 1)) returning id into dd;
  r := r || case when (select tipo from casos where id=dp)='documental' and (select analise||fatos||estrategia||conclusao from casos where id=dp)='fundfatosestrconcl' then 'PASS' else 'FAIL' end || ' demanda documental com análise profissional estruturada' || E'\n';
  ok := false; begin update casos set tipo='inexistente' where id=dp; exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' tipo inválido rejeitado' || E'\n';
  -- cada demanda com o seu contexto
  insert into documentos(contato_id,caso_id,descricao) values (c,dp,'Certidão de casamento'),(c,di,'Certidão de óbito'),(c,dd,'Certidão de casamento atualizada');
  insert into honorarios(contato_id,caso_id,descricao,valor,tipo,status) values (c,dp,'Pacto',3000,'Contrato fixo','Contratado'),(c,di,'Inventário',9000,'Contrato fixo','Proposta');
  insert into tarefas_internas(titulo,caso_id,prazo) values ('Minutar pacto',dp,current_date+3),('Levantar bens',di,current_date+5);
  insert into atividades(contato_id,caso_id,tipo,texto) values (c,dp,'Anotação','pacto'),(c,di,'Anotação','inventário');
  insert into demanda_notas(caso_id,tipo,texto) values (dp,'anotacao','Regime de separação total definido'),(di,'conclusao','Inventário judicial: há herdeiro menor');
  r := r || case when (select contato_id from demanda_notas where caso_id=dp)=c then 'PASS' else 'FAIL' end || ' anotação da análise herda a pessoa da demanda' || E'\n';
  ok := false; begin insert into demanda_notas(caso_id,contato_id,texto) values (dp,(select id from contatos where telefone <> '71900000301' limit 1),'x'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' anotação com pessoa diferente da demanda é rejeitada' || E'\n';
  ok := false; begin insert into demanda_notas(caso_id,texto) values (dp,'   '); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' anotação vazia rejeitada' || E'\n';
  r := r || case when (select count(*) from documentos where caso_id=dp)=1 and (select count(*) from documentos where caso_id=di)=1 and (select count(*) from honorarios where caso_id=dp)=1 and (select count(*) from tarefas_internas where caso_id=di)=1 and (select count(*) from atividades where caso_id=dd)=0 and (select count(*) from demanda_notas where caso_id=di)=1 then 'PASS' else 'FAIL' end || ' documentos, honorários, tarefas, histórico e anotações ficam na demanda certa' || E'\n';
  -- respostas específicas por demanda (perguntas de demanda)
  select id into q1 from formulario_perguntas where escopo='demanda' order by id limit 1;
  insert into caso_respostas(caso_id,pergunta_id,resposta) values (dp,q1,'"pacto"'),(di,q1,'"inventário"');
  r := r || case when (select resposta::text from caso_respostas where caso_id=dp and pergunta_id=q1)='"pacto"' and (select resposta::text from caso_respostas where caso_id=di and pergunta_id=q1)='"inventário"' and not exists(select 1 from caso_respostas where caso_id=dd) then 'PASS' else 'FAIL' end || ' respostas de demanda não vazam entre demandas' || E'\n';
  -- evolução: documental → extrajudicial (procedimento) ; processo/procedimento sempre na demanda certa
  insert into processos(caso_id,contato_id,natureza,numero) values (dp,c,'extrajudicial','PACTO-1') returning id into pr;
  ok := false; begin insert into documentos(contato_id,caso_id,processo_id,descricao) values (c,di,pr,'doc de outra demanda'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' procedimento do pacto não aceita documento do inventário' || E'\n';
  ok := false; begin insert into honorarios(contato_id,caso_id,valor) values ((select id from contatos where telefone <> '71900000301' limit 1),dp,1); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' honorário de outra pessoa na demanda é rejeitado' || E'\n';
  -- excluir demanda leva as anotações e preserva a pessoa e as outras demandas
  delete from casos where id=dp;
  r := r || case when (select count(*) from demanda_notas where caso_id=dp)=0 and (select count(*) from demanda_notas where caso_id=di)=1 and exists(select 1 from casos where id=di) and exists(select 1 from contatos where id=c) then 'PASS' else 'FAIL' end || ' excluir uma demanda não afeta as outras nem a pessoa' || E'\n';
  raise exception E'RESULTADO FASE3 — DEMANDA (banco)\n%', r;
end $$;
