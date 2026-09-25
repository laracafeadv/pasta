-- =============================================================================
-- CRM Lara Café — migração 5
-- Integração com o Google Drive (repositório único de documentos por cliente).
-- =============================================================================
alter table public.contatos
  add column if not exists drive_pasta_id   text,      -- pasta do cliente no Drive compartilhado
  add column if not exists drive_pasta_url  text,
  add column if not exists drive_subpastas  jsonb not null default '{}';  -- { contrato: "<id>", pecas: "<id>", ... }
