-- Endurecimento (advisors do Supabase) e índices das chaves novas. Nada de dados é alterado.
alter function public.set_updated_at() set search_path = public;
alter function public.marcar_etapa_desde() set search_path = public;
alter function public.auditoria_imutavel() set search_path = public;
-- Função de gatilho: não precisa ser chamável pela API pública.
revoke execute on function public.limpar_sugestao_ao_responder() from public, anon, authenticated;

create index if not exists partes_contato_idx on public.partes(contato_id);
create index if not exists formulario_itens_pergunta_idx on public.formulario_itens(pergunta_id);

-- Colunas de processo antigas em casos: substituídas por public.processos (dados migrados). Mantidas só como histórico.
comment on column public.casos.numero_processo is 'OBSOLETA: use public.processos.numero';
comment on column public.casos.orgao is 'OBSOLETA: use public.processos.orgao';
comment on column public.casos.comarca is 'OBSOLETA: use public.processos.comarca';
comment on column public.casos.uf is 'OBSOLETA: use public.processos.uf';
comment on column public.casos.fase_processual is 'OBSOLETA: use public.processos.fase';
comment on column public.casos.valor_causa is 'OBSOLETA: use public.processos.valor';
comment on column public.casos.link_tribunal is 'OBSOLETA: use public.processos.link';
comment on column public.casos.parte_contraria is 'OBSOLETA: use public.partes';

-- Processos: tribunal e condição de exibição das perguntas do construtor.
alter table public.processos add column if not exists tribunal text;
alter table public.formulario_perguntas add column if not exists mostrar_se jsonb; -- { pergunta_id, igual_a }
