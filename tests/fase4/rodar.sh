#!/usr/bin/env bash
# Fluxos da Fase 4: inventário e divórcio (judicial e extrajudicial) e consultiva que gera processo.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
$ESB tests/fase4/fluxos.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase3/stub-supabase.ts --outfile=/tmp/fluxos.test.mjs --log-level=warning
node /tmp/fluxos.test.mjs
