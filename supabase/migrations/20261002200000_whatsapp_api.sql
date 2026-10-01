-- WhatsApp Cloud API via Supabase (sem Vercel): recebimento por Edge Function (webhook) e envio por fila de saída.
-- Aditiva. A fila dispara a função de envio por pg_net; pg_cron reprocessa pendentes.

-- 1) Mensagens: status de entrega/leitura, erro, demanda e metadados
alter table public.mensagens_whatsapp
  add column if not exists status text check (status in ('recebida', 'enviada', 'entregue', 'lida', 'falhou')),
  add column if not exists status_em timestamptz,
  add column if not exists erro text,
  add column if not exists caso_id bigint references public.casos (id) on delete set null,
  add column if not exists metadata jsonb,
  add column if not exists template_nome text;
create index if not exists mensagens_caso_idx on public.mensagens_whatsapp (caso_id) where caso_id is not null;

-- 2) Fila de saída (o CRM grava aqui; a função de envio chama a Meta)
create table if not exists public.whatsapp_saida (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  contato_id bigint not null references public.contatos (id) on delete cascade,
  caso_id bigint references public.casos (id) on delete set null,
  telefone text not null,
  tipo text not null default 'texto' check (tipo in ('texto', 'template', 'sincronizar_templates')),
  texto text,
  template_nome text,
  template_idioma text,
  template_params jsonb,
  status text not null default 'pendente' check (status in ('pendente', 'enviando', 'enviada', 'falhou')),
  tentativas int not null default 0,
  erro text,
  wa_message_id text,
  enviado_em timestamptz,
  criado_por text
);
create index if not exists whatsapp_saida_pendentes_idx on public.whatsapp_saida (status, created_at) where status in ('pendente', 'enviando');
alter table public.whatsapp_saida enable row level security;
drop policy if exists "whatsapp_saida: equipe" on public.whatsapp_saida;
create policy "whatsapp_saida: equipe" on public.whatsapp_saida for all using (public.is_staff()) with check (public.is_staff());

-- 3) Modelos (templates) aprovados pela Meta — sincronizados, nunca escritos à mão
create table if not exists public.whatsapp_templates (
  nome text not null,
  idioma text not null,
  categoria text,
  status text,
  componentes jsonb,
  sincronizado_em timestamptz not null default now(),
  primary key (nome, idioma)
);
alter table public.whatsapp_templates enable row level security;
drop policy if exists "whatsapp_templates: equipe" on public.whatsapp_templates;
create policy "whatsapp_templates: equipe" on public.whatsapp_templates for all using (public.is_staff()) with check (public.is_staff());

-- 4) Disparo imediato da função de envio quando entra algo na fila (pg_net, assíncrono)
create extension if not exists pg_net with schema extensions;
create or replace function public.whatsapp_saida_disparar() returns trigger
language plpgsql security definer set search_path = public, extensions as $fn$
begin
  perform net.http_post(url := 'https://cuaeuazmgwdhfozrqkin.supabase.co/functions/v1/crm-api/enviar', headers := '{"Content-Type":"application/json"}'::jsonb, body := jsonb_build_object('id', new.id));
  return new;
end $fn$;
drop trigger if exists trg_whatsapp_saida_disparar on public.whatsapp_saida;
create trigger trg_whatsapp_saida_disparar after insert on public.whatsapp_saida
  for each row execute function public.whatsapp_saida_disparar();

-- 5) Rede de segurança: a cada minuto reprocessa pendentes que não foram disparados
create extension if not exists pg_cron;
select cron.schedule('whatsapp-saida-varrer', '* * * * *', $cron$select net.http_post(url := 'https://cuaeuazmgwdhfozrqkin.supabase.co/functions/v1/crm-api/enviar', headers := '{"Content-Type":"application/json"}'::jsonb, body := '{"varrer": true}'::jsonb)$cron$);
