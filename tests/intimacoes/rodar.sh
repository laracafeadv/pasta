#!/usr/bin/env bash
# Regras das intimações (server/utils/intimacoes.ts) sobre banco em memória.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
$ESB tests/intimacoes/intimacoes.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase3/stub-supabase.ts --outfile=/tmp/intimacoes.test.mjs --log-level=warning
node /tmp/intimacoes.test.mjs
