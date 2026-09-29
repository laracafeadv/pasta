-- Fechamento da arquitetura: estados da pessoa, análise da demanda, ciclo de documentos, campos do processo e tarefa única.

-- 1) Pessoa relacionada (parte/interessado cadastrada sem ser lead nem cliente) + rótulo da consulta realizada.
alter table public.contatos drop constraint if exists contatos_etapa_check;
alter table public.contatos add constraint contatos_etapa_check check (etapa = any (array[
  'novo','qualificacao','agendado','diagnostico','proposta','ativo','concluido','perdido','relacionado'
]));

-- 2) Análise jurídica do escritório: campos próprios da demanda (não são resposta de formulário).
alter table public.casos
  add column if not exists analise text,
  add column if not exists riscos text,
  add column if not exists decisao text check (decisao in ('viavel','ressalvas','inviavel'));

-- Migra o que foi semeado como perguntas em "Análise da consulta" e remove essas 3 perguntas (dados preservados nos campos).
update public.casos c set analise = nullif(r.resposta #>> '{}', '')
from public.caso_respostas r join public.formulario_perguntas p on p.id = r.pergunta_id
where r.caso_id = c.id and p.texto = 'Causa raiz (5 porquês)' and p.secao = 'Análise da consulta' and c.analise is null;
update public.casos c set riscos = nullif(r.resposta #>> '{}', '')
from public.caso_respostas r join public.formulario_perguntas p on p.id = r.pergunta_id
where r.caso_id = c.id and p.texto = 'Riscos e ressalvas' and p.secao = 'Análise da consulta' and c.riscos is null;
update public.casos c set decisao = case r.resposta #>> '{}' when 'Viável' then 'viavel' when 'Viável com ressalvas' then 'ressalvas' when 'Não viável' then 'inviavel' end
from public.caso_respostas r join public.formulario_perguntas p on p.id = r.pergunta_id
where r.caso_id = c.id and p.texto = 'Decisão da consulta' and p.secao = 'Análise da consulta' and c.decisao is null;
delete from public.caso_respostas r using public.formulario_perguntas p
where p.id = r.pergunta_id and p.secao = 'Análise da consulta' and p.texto in ('Causa raiz (5 porquês)', 'Riscos e ressalvas', 'Decisão da consulta')
  and exists (select 1 from public.casos c where c.id = r.caso_id and (c.analise is not null or c.riscos is not null or c.decisao is not null));
delete from public.formulario_perguntas p
where p.secao = 'Análise da consulta' and p.texto in ('Causa raiz (5 porquês)', 'Riscos e ressalvas', 'Decisão da consulta')
  and not exists (select 1 from public.caso_respostas r where r.pergunta_id = p.id)
  and not exists (select 1 from public.formulario_itens i where i.pergunta_id = p.id);

-- 3) Processo/procedimento: responsável e tipo do procedimento (extrajudicial).
alter table public.processos add column if not exists responsavel_nome text, add column if not exists tipo_procedimento text;

-- 4) Documentos: vínculo com processo e parte, origem (solicitado × produzido), ciclo completo e metadados do arquivo
--    (prontos para receber o Drive ou outro armazenamento; nada é simulado).
alter table public.documentos
  add column if not exists processo_id bigint references public.processos(id) on delete set null,
  add column if not exists parte_id bigint references public.partes(id) on delete set null,
  add column if not exists origem text not null default 'solicitado' check (origem in ('solicitado','produzido')),
  add column if not exists arquivo_provedor text check (arquivo_provedor in ('drive','supabase','link')),
  add column if not exists arquivo_ref text,
  add column if not exists arquivo_url text,
  add column if not exists arquivo_nome text,
  add column if not exists arquivo_mime text,
  add column if not exists arquivo_tamanho bigint,
  add column if not exists arquivo_em timestamptz;
alter table public.documentos drop constraint if exists documentos_status_check;
alter table public.documentos add constraint documentos_status_check check (status = any (array['pendente','recebido','conferido','dispensado','rascunho','final']));
create index if not exists documentos_processo_idx on public.documentos(processo_id) where processo_id is not null;
create index if not exists documentos_parte_idx on public.documentos(parte_id) where parte_id is not null;

-- 5) Tarefa única: tarefas criadas como "compromisso do tipo tarefa" passam para tarefas_internas.
insert into public.tarefas_internas (titulo, descricao, concluida, prazo, contato_id, caso_id)
select c.titulo, c.observacao, c.status = 'concluido', coalesce(c.data_limite, (c.inicio at time zone 'America/Bahia')::date), c.contato_id, c.caso_id
from public.compromissos c where c.tipo = 'tarefa' and c.status <> 'cancelado';
delete from public.compromissos where tipo = 'tarefa';
