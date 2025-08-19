#!/bin/sh
# deploy/backend-entrypoint.sh

# Para o script se houver qualquer erro
set -e

echo "==> Running database migrations..."
npx knex migrate:latest

echo "==> Seeding database..."
npx knex seed:run

echo "==> Starting server..."
# O 'exec' passa o controle total para o npm start
exec npm start