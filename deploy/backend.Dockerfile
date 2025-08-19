# deploy/backend.Dockerfile (versão PostgreSQL)
FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

COPY backend-kanban/package*.json ./
# O "npm install" agora será mais rápido e sem compilação nativa
RUN npm install 

COPY backend-kanban/ .

# O entrypoint ainda é uma boa prática
COPY deploy/backend-entrypoint.sh /app/backend-entrypoint.sh
RUN chmod +x /app/backend-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/app/backend-entrypoint.sh"]