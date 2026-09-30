#!/usr/bin/env bash
# Fase 5: partes e pessoas relacionadas (server/utils/partes.ts) sobre banco em memória.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
$ESB tests/fase5/partes.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase3/stub-supabase.ts --outfile=/tmp/fase5.test.mjs --log-level=warning
node /tmp/fase5.test.mjs
