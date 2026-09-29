-- FASE 4 — Judicial × Extrajudicial no banco real (com rollback): campos por natureza, etapas, pendências,
-- vínculos de tarefa/histórico ao processo certo e a evolução na MESMA demanda.
do $$
declare r text := ''; c bigint; di bigint; dj bigint; pe bigint; pj bigint; ok boolean; n int; t bigint;
begin
  insert into contatos(nome,telefone,etapa) values ('ZZ Fase4','71900000401','ativo') returning id into c;
  insert into casos(contato_id,titulo,tipo,procedimento) values (c,'Inventário extrajudicial','consultivo','inventario/extrajudicial') returning id into di;
  insert into casos(contato_id,titulo,tipo,procedimento) values (c,'Inventário judicial','consultivo','inventario/judicial') returning id into dj;
  -- procedimento extrajudicial: cartório, tipo, protocolo; sem tribunal
  insert into processos(caso_id,contato_id,natureza,tipo_procedimento,orgao,comarca,uf,numero) values (di,c,'extrajudicial','Inventário extrajudicial (escritura)','2º Tabelionato','Salvador','BA','Livro 1 fl. 2') returning id into pe;
  ok := false; begin insert into processos(caso_id,contato_id,natureza,tipo_procedimento,tribunal) values (di,c,'extrajudicial','x','TJBA'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' extrajudicial não aceita tribunal (campo do judicial)' || E'\n';
  -- processo judicial: CNJ único, tribunal, vara; sem tipo de procedimento
  insert into processos(caso_id,contato_id,natureza,numero,tribunal,orgao,comarca,uf,fase,valor) values (dj,c,'judicial','9999999-99.2026.8.05.0001','TJBA','3ª Vara de Sucessões','Salvador','BA','Postulatória (petição inicial)',850000) returning id into pj;
  ok := false; begin insert into processos(caso_id,contato_id,natureza,tipo_procedimento) values (dj,c,'judicial','Inventário extrajudicial (escritura)'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' judicial não aceita tipo de procedimento (campo do extrajudicial)' || E'\n';
  ok := false; begin insert into processos(caso_id,contato_id,natureza,numero) values (dj,c,'judicial','9999999-99.2026.8.05.0001'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' número CNJ não se repete entre processos judiciais' || E'\n';
  -- etapas e pendências do procedimento
  insert into processo_etapas(processo_id,ordem,titulo) values (pe,1,'Protocolo'),(pe,2,'Exigências'),(pe,3,'Lavratura');
  update processo_etapas set status='concluida', concluida_em=current_date where processo_id=pe and ordem=1;
  update processo_etapas set status='dispensada', concluida_em=current_date where processo_id=pe and ordem=2;
  ok := false; begin update processo_etapas set status='qualquer' where processo_id=pe and ordem=3; exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' status de etapa inválido é rejeitado' || E'\n';
  insert into processo_pendencias(processo_id,descricao,aguardando,prazo) values (pe,'Certidão de ônus atualizada','cliente',current_date+10);
  ok := false; begin insert into processo_pendencias(processo_id,descricao,aguardando) values (pe,'x','ninguem'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' "aguardando" inválido é rejeitado' || E'\n';
  r := r || case when (select count(*) from processo_etapas where processo_id=pe and status='pendente')=1 and (select count(*) from processo_pendencias where processo_id=pe and resolvida_em is null)=1 then 'PASS' else 'FAIL' end || ' etapas e pendências ficam no procedimento certo' || E'\n';
  -- tarefa e histórico do processo/procedimento
  insert into tarefas_internas(titulo,processo_id,prazo) values ('Levar certidão ao cartório',pe,current_date+2) returning id into t;
  r := r || case when (select caso_id from tarefas_internas where id=t)=di and (select contato_id from tarefas_internas where id=t)=c then 'PASS' else 'FAIL' end || ' tarefa do procedimento herda a demanda e a pessoa' || E'\n';
  ok := false; begin insert into tarefas_internas(titulo,caso_id,processo_id,prazo) values ('x',dj,pe,current_date); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' tarefa não liga procedimento de uma demanda a outra demanda' || E'\n';
  insert into atividades(contato_id,tipo,texto,processo_id) values (c,'Andamento','Cartório protocolou',pe);
  r := r || case when (select caso_id from atividades where processo_id=pe order by id desc limit 1)=di then 'PASS' else 'FAIL' end || ' histórico do procedimento herda a demanda' || E'\n';
  ok := false; begin insert into atividades(contato_id,caso_id,tipo,texto,processo_id) values (c,dj,'Andamento','x',pe); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' histórico não mistura demandas' || E'\n';
  ok := false; begin insert into documentos(contato_id,caso_id,processo_id,descricao) values (c,dj,pe,'x'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' documento continua preso ao processo da própria demanda' || E'\n';
  -- prazo do procedimento (compromissos passa pelo mesmo trigger: precisa funcionar)
  insert into compromissos(tipo,titulo,contato_id,processo_id,data_limite) values ('prazo','Validade da certidão',c,pe,current_date+20);
  r := r || case when (select caso_id from compromissos where processo_id=pe and titulo='Validade da certidão')=di then 'PASS' else 'FAIL' end || ' prazo do procedimento herda a demanda (trigger de compromissos funciona)' || E'\n';
  -- polo da parte
  insert into partes(caso_id,nome,papel,polo) values (dj,'ZZ Herdeiro','Herdeiro','ativo');
  ok := false; begin insert into partes(caso_id,nome,papel,polo) values (dj,'x','Herdeiro','meio'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' polo da parte: só ativo ou passivo' || E'\n';
  -- evolução na MESMA demanda: consultiva → extrajudicial → convertido → judicial (dois processos, uma demanda)
  update processos set status='encerrado', desfecho='Convertido em processo judicial', data_encerramento=current_date where id=pe;
  insert into processos(caso_id,contato_id,natureza,tribunal,orgao) values (di,c,'judicial','TJBA','1ª Vara de Sucessões');
  r := r || case when (select count(*) from casos where contato_id=c)=2 and (select count(*) from processos where caso_id=di)=2 then 'PASS' else 'FAIL' end || ' conversão para judicial acontece na mesma demanda (nada duplicado)' || E'\n';
  -- excluir processo: etapas/pendências/andamentos vão juntos; tarefas ficam na demanda
  delete from processos where id=pe;
  r := r || case when (select count(*) from processo_etapas where processo_id=pe)=0 and (select count(*) from processo_pendencias where processo_id=pe)=0 and exists(select 1 from tarefas_internas where id=t and processo_id is null and caso_id=di) and exists(select 1 from casos where id=di) then 'PASS' else 'FAIL' end || ' excluir o procedimento leva etapas e pendências, mantém tarefas e histórico na demanda' || E'\n';
  r := r || case when not exists(select 1 from casos where procedimento='inventario/padrao') then 'PASS' else 'FAIL' end || ' migração: inventario/padrao virou inventario/extrajudicial' || E'\n';
  raise exception E'RESULTADO FASE4 (banco)\n%', r;
end $$;
