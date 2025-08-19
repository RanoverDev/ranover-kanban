# deploy/backend.Dockerfile

# A MUDANÇA CRUCIAL ESTÁ AQUI: Adicionamos --platform=linux/amd64
FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

COPY backend-kanban/package*.json ./
RUN npm install

RUN chmod +x -R ./node_modules/.bin

COPY backend-kanban/ .
COPY deploy/backend-entrypoint.sh /app/backend-entrypoint.sh
RUN chmod +x /app/backend-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/app/backend-entrypoint.sh"]