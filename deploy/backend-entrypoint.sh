#!/bin/sh
# deploy/backend-entrypoint.sh

set -e

echo "==> Running database migrations..."
# Forma direta de chamar o knex, sem usar npx
node /app/backend/node_modules/knex/bin/cli.js migrate:latest

echo "==> Seeding database..."
# Forma direta de chamar o knex, sem usar npx
node /app/backend/node_modules/knex/bin/cli.js seed:run

echo "==> Starting server..."
exec npm start