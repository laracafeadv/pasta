#!/usr/bin/env bash
# Testa o núcleo do construtor de formulários (server/utils/formularioEstrutura.ts + shared/data/formulario.ts) sobre um banco em memória.
set -e
cd "$(dirname "$0")/../.."
ESB=${ESBUILD:-node_modules/.bin/esbuild}
$ESB tests/formularios/construtor.test.ts --bundle --platform=node --format=esm --outfile=/tmp/construtor.test.mjs --log-level=warning
node /tmp/construtor.test.mjs
