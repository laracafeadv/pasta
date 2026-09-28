-- =============================================================================
-- CRM Lara Café — remove a biblioteca de documentos (/documentos), a pedido.
-- Estava vazia. O checklist de documentos da ficha do cliente continua.
-- (O bucket 'documentos', vazio e privado, fica: o Supabase só deixa apagar
-- bucket pela API de Storage, não por SQL.)
-- =============================================================================
drop table if exists public.arquivos;
