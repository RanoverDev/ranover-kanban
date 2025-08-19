# deploy/backend.Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend-kanban/package*.json ./
RUN npm install

# =======================================================
# ADICIONE ESTA LINHA PARA CORRIGIR A PERMISSÃO DO KNEX
RUN chmod +x -R ./node_modules/.bin
# =======================================================

# Copia o resto do código da aplicação
COPY backend-kanban/ .

# Copia o nosso script de inicialização
COPY deploy/backend-entrypoint.sh /app/backend-entrypoint.sh
RUN chmod +x /app/backend-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/app/backend-entrypoint.sh"]