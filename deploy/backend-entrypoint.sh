#!/bin/sh
# deploy/backend-entrypoint.sh

set -e

echo "==> Running database migrations..."
# CAMINHO CORRIGIDO: removido o "/backend"
node /app/node_modules/knex/bin/cli.js migrate:latest

echo "==> Seeding database..."
# CAMINHO CORRIGIDO: removido o "/backend"
node /app/node_modules/knex/bin/cli.js seed:run

echo "==> Starting server..."
exec npm start