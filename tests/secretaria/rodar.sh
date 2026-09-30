#!/usr/bin/env bash
# Secretária: calendário forense + texto livre (funções puras), regras do servidor e conexão com o Google (API simulada).
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
for t in calendario servidor google; do
  $ESB tests/secretaria/$t.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase3/stub-supabase.ts --outfile=/tmp/secretaria-$t.test.mjs --log-level=warning
  node /tmp/secretaria-$t.test.mjs | grep -E "FAIL|passaram|FALHA" || true
done
