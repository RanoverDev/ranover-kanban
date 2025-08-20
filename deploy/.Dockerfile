# deploy/Dockerfile.unified

# --- Estágio 1: Construir o Frontend ---
FROM --platform=linux/amd64 node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend-kanban/package*.json ./
RUN npm install

# ADICIONE ESTA LINHA PARA CORRIGIR A PERMISSÃO
RUN chmod +x -R ./node_modules/.bin

COPY frontend-kanban/ .
RUN npm run build


# --- Estágio 2: Construir o Backend ---
FROM --platform=linux/amd64 node:18-alpine AS backend-builder
WORKDIR /app
COPY backend-kanban/package*.json ./
RUN npm install 

# BOA PRÁTICA: Adicionar a mesma correção aqui para consistência
RUN chmod +x -R ./node_modules/.bin

COPY backend-kanban/ .


# --- Estágio 3: Imagem Final ---
FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app

COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app .
COPY deploy/backend-entrypoint.sh ./backend-entrypoint.sh
RUN chmod +x ./backend-entrypoint.sh

COPY --from=frontend-builder /app/build ./public

EXPOSE 8080
ENTRYPOINT ["./backend-entrypoint.sh"]