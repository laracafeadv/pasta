-- FASE 2 — trava do ciclo no banco (roda com rollback: termina sempre em RAISE EXCEPTION com o resultado).
-- As regras de aplicação (proposta por demanda, promoção a cliente etc.) são testadas em tests/fase2/rodar.sh.
do $$
declare r text := ''; c bigint; ok boolean; e text;
begin
  insert into contatos(nome, telefone, etapa) values ('ZZ Ciclo','71900000101','novo') returning id into c;
  update contatos set etapa='qualificacao' where id=c; update contatos set etapa='agendado' where id=c;
  update contatos set etapa='diagnostico' where id=c; update contatos set etapa='proposta' where id=c;
  update contatos set etapa='ativo' where id=c;
  r := r || 'PASS lead percorre o funil e vira cliente na mesma linha' || E'\n';
  foreach e in array array['novo','qualificacao','agendado','diagnostico','proposta','perdido','relacionado'] loop
    ok := false;
    begin update contatos set etapa=e where id=c; exception when others then ok := true; end;
    r := r || case when ok then 'PASS' else 'FAIL' end || ' cliente ativo não vai para ' || e || E'\n';
  end loop;
  update contatos set etapa='concluido' where id=c;
  ok := false;
  begin update contatos set etapa='novo' where id=c; exception when others then ok := true; end;
  r := r || case when ok then 'PASS' else 'FAIL' end || ' cliente concluído não volta ao funil' || E'\n';
  update contatos set etapa='ativo' where id=c;
  r := r || 'PASS concluído → ativo (nova demanda) permitido' || E'\n';
  insert into contatos(nome, telefone, etapa) values ('ZZ Perdido','71900000102','perdido') returning id into c;
  update contatos set etapa='qualificacao' where id=c; update contatos set etapa='ativo' where id=c;
  r := r || 'PASS quem não contratou pode voltar e contratar na mesma ficha' || E'\n';
  raise exception E'RESULTADO FASE2 (banco)\n%', r;
end $$;
