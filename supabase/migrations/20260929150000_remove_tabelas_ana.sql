-- Remove só o que era exclusivo da Ana (RAG/insights) e estava vazio.
-- Mantidos de propósito: eva_system_prompt, eva_prompt_history (histórico), extensão vector, contatos.ia_ativa.
drop function if exists public.match_documents(vector, integer, jsonb);
drop table if exists public.ana_insights;
drop table if exists public.documents;
