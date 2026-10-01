# Testes do construtor de formulários

1. `./tests/formularios/rodar.sh` — núcleo (estrutura, lógica condicional, validação, histórico, ficha) sobre banco em memória. Não precisa de nada além do esbuild do projeto.
2. `supabase/tests/fase3_construtor_formularios.sql` — trigger de versões, coerência de contexto e migração, no banco real (termina em rollback).
3. `ui.mjs` — interface real (Playwright + Chromium) com a API simulada em Node usando as regras reais do servidor.
   Preparação (temporária, não commitar): copiar `paginas-temporarias/*.vue` para `app/pages/`, incluir `'/__t_*'` em
   `supabase.redirectOptions.exclude` no `nuxt.config.ts`, gerar o harness
   (`esbuild tests/formularios/harness.ts --bundle --platform=node --format=esm --outfile=/tmp/harness.mjs`),
   `SUPABASE_URL=http://localhost:9 SUPABASE_PUBLISHABLE_KEY=x SUPABASE_SECRET_KEY=y npm run build`, subir `PORT=3100 node .output/server/index.mjs`
   e rodar `node tests/formularios/ui.mjs /tmp/harness.mjs <pasta-de-prints>`.
