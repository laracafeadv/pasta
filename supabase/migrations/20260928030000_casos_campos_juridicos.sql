-- Campos que faltavam para um CRM jurídico completo: fase do processo,
-- valor da causa (distinto de honorários) e link direto para o tribunal.

alter table public.casos
  add column if not exists fase_processual text,
  add column if not exists valor_causa     numeric,
  add column if not exists link_tribunal   text;
