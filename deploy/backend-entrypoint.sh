#!/bin/sh
# deploy/backend-entrypoint.sh

set -e

echo "==> Forcing rebuild of native modules for the correct architecture..."
# COMANDO ADICIONADO: Força a recompilação do sqlite3 no ambiente de execução
npm rebuild sqlite3 --build-from-source

echo "==> Running database migrations..."
node /app/node_modules/knex/bin/cli.js migrate:latest

echo "==> Seeding database..."
node /app/node_modules/knex/bin/cli.js seed:run

echo "==> Starting server..."
exec npm start