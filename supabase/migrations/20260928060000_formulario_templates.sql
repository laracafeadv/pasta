-- =============================================================================
-- CRM Lara Café — modelos de formulário pré-consulta (perguntas específicas
-- reutilizáveis, criadas e editadas pela própria advogada).
-- =============================================================================
create table if not exists public.formulario_templates (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  nome        text not null,
  perguntas   jsonb not null default '[]'::jsonb
);
create trigger formulario_templates_updated_at before update on public.formulario_templates
  for each row execute function public.set_updated_at();
alter table public.formulario_templates enable row level security;
create policy "formulario_templates: equipe" on public.formulario_templates
  for all using (public.is_staff()) with check (public.is_staff());
