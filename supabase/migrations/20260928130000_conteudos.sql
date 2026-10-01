-- =============================================================================
-- CRM Lara Café — planejamento editorial (posts, Reels, Stories, artigos) com
-- pipeline Ideia → Publicado e data de publicação para o calendário.
-- =============================================================================
create table if not exists public.conteudos (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  titulo          text not null,
  tema            text,
  formato         text not null default 'post' check (formato in ('post','reels','stories','carrossel','artigo','video','outro')),
  plataforma      text not null default 'instagram' check (plataforma in ('instagram','linkedin','tiktok','youtube','blog','whatsapp','outro')),
  legenda         text,
  cta             text,
  data_publicacao date,
  status          text not null default 'ideia' check (status in ('ideia','rascunho','producao','revisao','agendado','publicado'))
);
create trigger conteudos_updated_at before update on public.conteudos
  for each row execute function public.set_updated_at();
create index if not exists conteudos_data_idx on public.conteudos (data_publicacao);
alter table public.conteudos enable row level security;
create policy "conteudos: equipe" on public.conteudos
  for all using (public.is_staff()) with check (public.is_staff());
