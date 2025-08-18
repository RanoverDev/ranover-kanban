# backend.Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependência e instala
COPY backend-kanban/package*.json ./
RUN npm install

# Copia o resto do código da aplicação
COPY backend-kanban/ .

# Expõe a porta que o backend usa
EXPOSE 3001

# Comando para iniciar o servidor e rodar migrations/seeds
CMD [ "sh", "-c", "npx knex migrate:latest && npx knex seed:run && npm start" ]