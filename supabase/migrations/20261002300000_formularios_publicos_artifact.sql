-- Formulários publicados a partir do CRM (artifact): versão publicada imutável por envio, link público por token, resposta por pergunta.
alter table public.formularios add column if not exists ref text, add column if not exists estrutura jsonb, add column if not exists publicado_em timestamptz;
create unique index if not exists formularios_ref_key on public.formularios (ref) where ref is not null;
comment on column public.formularios.ref is 'Identificador estável do formulário no CRM (artifact). Cada publicação grava a estrutura em "estrutura" e sobe "versao".';
alter table public.formulario_envio_respostas add column if not exists pergunta_ref text;
-- Pessoas/Demandas espelhadas do CRM: dados de demonstração ficam marcados e nunca se misturam com os reais
alter table public.contatos add column if not exists exemplo boolean not null default false;
alter table public.casos add column if not exists exemplo boolean not null default false;
alter table public.mensagens_whatsapp add column if not exists lida_em timestamptz;
