#!/usr/bin/env bash
# Testes da Fase 3 (Demanda/Serviço e análise): isolamento por serviço, análise profissional, evolução da atuação.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
$ESB tests/fase3/demanda.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase3/stub-supabase.ts --outfile=/tmp/demanda.test.mjs --log-level=warning
node /tmp/demanda.test.mjs
