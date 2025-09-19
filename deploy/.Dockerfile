# deploy/Dockerfile.unified

# --- Estágio 1: Construir o Frontend ---
FROM --platform=linux/amd64 node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend-kanban/package*.json ./
COPY frontend-kanban/ .
RUN npm install
RUN npm run build

# --- Estágio 2: Construir o Backend ---
FROM --platform=linux/amd64 node:18-alpine AS backend-builder
WORKDIR /app
COPY backend-kanban/package*.json ./
COPY backend-kanban/ .
RUN npm install

# --- Estágio 3: Imagem Final ---
FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app

COPY --from=backend-builder /app .
COPY deploy/backend-entrypoint.sh ./backend-entrypoint.sh
RUN chmod +x ./backend-entrypoint.sh
COPY --from=frontend-builder /app/build ./public

EXPOSE 8080
ENTRYPOINT ["./backend-entrypoint.sh"]