#!/usr/bin/env bash
# Secretária: calendário forense + texto livre (funções puras) e regras do servidor sobre banco em memória.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
$ESB tests/secretaria/calendario.test.ts --bundle --platform=node --format=esm --outfile=/tmp/secretaria1.test.mjs --log-level=warning
$ESB tests/secretaria/servidor.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase3/stub-supabase.ts --outfile=/tmp/secretaria2.test.mjs --log-level=warning
node /tmp/secretaria1.test.mjs | tail -3
node /tmp/secretaria2.test.mjs
