-- FASE 3 — construtor de formulários no banco (roda com rollback: termina sempre em RAISE EXCEPTION com o resultado).
do $$
declare r text := ''; f bigint; fd bigint; pc bigint; pd bigint; ok boolean; v int; n int; s bigint;
begin
  r := r || case when not exists(select 1 from formulario_itens where secao_id is null) and exists(select 1 from formularios where contexto = 'demanda') then 'PASS' else 'FAIL' end || ' migração: formulários existentes têm contexto e todos os itens estão em seções' || E'\n';
  r := r || case when (select count(*) from caso_respostas) >= 6 and (select count(*) from contato_respostas) >= 2 then 'PASS' else 'FAIL' end || ' migração: respostas existentes intactas' || E'\n';
  r := r || case when not exists(select 1 from contato_respostas c where not exists(select 1 from formulario_perguntas p where p.id = c.pergunta_id)) then 'PASS' else 'FAIL' end || ' toda resposta guardada aponta para uma pergunta existente (histórico)' || E'\n';
  insert into formularios(nome, contexto) values ('ZZ cliente','cliente') returning id into f;
  insert into formularios(nome, contexto) values ('ZZ demanda','demanda') returning id into fd;
  insert into formulario_perguntas(texto,tipo,opcoes,escopo) values ('ZZ P','selecao_unica','["a","b"]','cliente') returning id into pc;
  insert into formulario_perguntas(texto,tipo,escopo) values ('ZZ D','texto_curto','demanda') returning id into pd;
  update formulario_perguntas set texto='ZZ P editada' where id=pc;
  update formulario_perguntas set opcoes='["a","b","c"]' where id=pc;
  update formulario_perguntas set arquivada=true where id=pc;
  select versao into v from formulario_perguntas where id=pc;
  select count(*) into n from formulario_pergunta_versoes where pergunta_id=pc;
  r := r || case when v=3 and n=2 and exists(select 1 from formulario_pergunta_versoes where pergunta_id=pc and versao=1 and texto='ZZ P') then 'PASS' else 'FAIL' end || ' histórico: cada edição de texto/opções guarda a versão anterior (arquivar não cria versão)' || E'\n';
  insert into formulario_itens(formulario_id,pergunta_id,ordem) values (f,pc,0);
  ok := false; begin insert into formulario_itens(formulario_id,pergunta_id,ordem) values (fd,pc,0); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' pergunta de cliente não entra em formulário de demanda' || E'\n';
  ok := false; begin insert into formulario_itens(formulario_id,pergunta_id,ordem) values (f,pd,1); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' pergunta de demanda não entra em formulário de cliente' || E'\n';
  insert into formulario_itens(formulario_id,pergunta_id,ordem) values (fd,pd,0);
  insert into formulario_perguntas(texto,tipo,opcoes,escopo) values ('ZZ L','lista_suspensa','["x","y"]','cliente');
  ok := false; begin insert into formulario_perguntas(texto,tipo,escopo) values ('ZZ X','tipo_inexistente','cliente'); exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' tipos válidos (lista suspensa aceita; tipo desconhecido rejeitado)' || E'\n';
  insert into formulario_secoes(formulario_id,titulo,ordem) values (f,'S',1) returning id into s;
  update formulario_itens set secao_id=s where formulario_id=f;
  insert into contatos(nome,telefone,etapa) values ('ZZ','71900000201','novo');
  insert into contato_respostas(contato_id,pergunta_id,resposta) select id,pc,'"a"' from contatos where telefone='71900000201';
  delete from formulario_secoes where id=s;
  r := r || case when (select count(*) from formulario_itens where formulario_id=f)=1 and (select secao_id from formulario_itens where formulario_id=f) is null then 'PASS' else 'FAIL' end || ' excluir seção não apaga a pergunta' || E'\n';
  delete from formularios where id=f;
  r := r || case when (select count(*) from formulario_itens where formulario_id=f)=0 and exists(select 1 from formulario_perguntas where id=pc) and exists(select 1 from contato_respostas where pergunta_id=pc) then 'PASS' else 'FAIL' end || ' excluir formulário preserva pergunta e respostas' || E'\n';
  raise exception E'RESULTADO FASE3 (banco)\n%', r;
end $$;
