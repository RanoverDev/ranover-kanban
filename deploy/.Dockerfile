# deploy/Dockerfile.unified (versão com ordem corrigida)

# --- Estágio 1: Construir o Frontend ---
FROM --platform=linux/amd64 node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend-kanban/package*.json ./
# COPIA O CÓDIGO FONTE PRIMEIRO
COPY frontend-kanban/ .
# RODA O NPM INSTALL DEPOIS, CRIANDO A VERSÃO CORRETA DE NODE_MODULES
RUN npm install
RUN npm run build


# --- Estágio 2: Construir o Backend ---
FROM --platform=linux/amd64 node:18-alpine AS backend-builder
WORKDIR /app
COPY backend-kanban/package*.json ./
# COPIA O CÓDIGO FONTE PRIMEIRO
COPY backend-kanban/ .
# RODA O NPM INSTALL DEPOIS
RUN npm install 


# --- Estágio 3: Imagem Final ---
FROM --platform=linux/amd64 node:18-alpine
WORKDIR /app

# Copia as dependências e o código do backend
COPY --from=backend-builder /app .

# Copia o script de inicialização
COPY deploy/backend-entrypoint.sh ./backend-entrypoint.sh
RUN chmod +x ./backend-entrypoint.sh

# Copia os arquivos buildados do frontend para a pasta 'public'
COPY --from=frontend-builder /app/build ./public

EXPOSE 8080
ENTRYPOINT ["./backend-entrypoint.sh"]