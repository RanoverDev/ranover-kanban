# deploy/Dockerfile.unified

# --- Estágio 1: Construir o Frontend ---
FROM --platform=linux/amd64 node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend-kanban/package*.json ./
RUN npm install
COPY frontend-kanban/ .
RUN npm run build


# --- Estágio 2: Construir o Backend ---
FROM --platform=linux/amd64 node:18-alpine AS backend-builder
WORKDIR /app
COPY backend-kanban/package*.json ./
RUN npm install
COPY backend-kanban/ .


# --- Estágio 3: Imagem Final ---
FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app

# Copia as dependências instaladas do backend
COPY --from=backend-builder /app/node_modules ./node_modules
# Copia o código-fonte do backend
COPY --from=backend-builder /app .
# Copia o script de inicialização
COPY deploy/backend-entrypoint.sh ./backend-entrypoint.sh
RUN chmod +x ./backend-entrypoint.sh

# Copia os arquivos buildados do frontend para a pasta 'public'
COPY --from=frontend-builder /app/build ./public

# Expõe a porta que a plataforma irá usar
EXPOSE 8080

ENTRYPOINT ["./backend-entrypoint.sh"]