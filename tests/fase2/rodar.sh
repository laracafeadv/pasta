#!/usr/bin/env bash
# Roda os cenários do ciclo comercial (regras em server/utils/ciclo.ts) sobre um banco em memória.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-npx --yes esbuild}
$ESB tests/fase2/ciclo.test.ts --bundle --platform=node --format=esm --alias:#supabase/server=./tests/fase2/stub-supabase.ts --outfile=/tmp/ciclo.test.mjs --log-level=warning
node /tmp/ciclo.test.mjs
