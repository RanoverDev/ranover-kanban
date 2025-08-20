#!/bin/sh
# deploy/backend-entrypoint.sh (versão simplificada)

set -e

echo "==> Running database migrations..."
node /app/node_modules/knex/bin/cli.js migrate:latest

echo "==> Seeding database..."
node /app/node_modules/knex/bin/cli.js seed:run

echo "==> Starting server..."
exec node server.js