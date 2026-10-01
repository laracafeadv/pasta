-- CRM Lara Café — performance: RLS sem reavaliar auth.uid() por linha + índices nas FKs usadas em filtros/junções.
alter policy "perfil: ler o próprio ou, se equipe, todos" on public.profiles
  using ((id = (select auth.uid())) or public.is_staff());
alter policy "notificacoes: dono" on public.notifications
  using (user_id = (select auth.uid()));
alter policy "staff pode tudo em tarefas_internas" on public.tarefas_internas
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::text, 'equipe'::text])))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = any (array['admin'::text, 'equipe'::text])));
alter policy "staff pode ler ana_insights" on public.ana_insights
  using (exists (select 1 from public.profiles where profiles.id = (select auth.uid()) and profiles.role = any (array['admin'::text, 'equipe'::text])));

create index if not exists compromissos_contato_id_idx on public.compromissos (contato_id);
create index if not exists compromissos_caso_id_idx on public.compromissos (caso_id);
create index if not exists tarefas_internas_contato_id_idx on public.tarefas_internas (contato_id);
create index if not exists tarefas_internas_caso_id_idx on public.tarefas_internas (caso_id);
create index if not exists lancamentos_contato_id_idx on public.lancamentos (contato_id);
create index if not exists lancamentos_honorario_id_idx on public.lancamentos (honorario_id);
create index if not exists formulario_envios_formulario_id_idx on public.formulario_envios (formulario_id);
