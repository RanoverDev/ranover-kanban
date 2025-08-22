# deploy/Dockerfile.unified (versão final com ARGs)

# --- Estágio 1: Construir o Frontend ---
# Declara os argumentos que receberemos do Easypanel
ARG REACT_APP_CHATWOOT_BASE_URL
ARG REACT_APP_CHATWOOT_ACCOUNT_ID

FROM --platform=linux/amd64 node:18-alpine AS frontend-builder
WORKDIR /app

# Define as variáveis de ambiente DENTRO deste estágio de build
ENV REACT_APP_CHATWOOT_BASE_URL=$REACT_APP_CHATWOOT_BASE_URL
ENV REACT_APP_CHATWOOT_ACCOUNT_ID=$REACT_APP_CHATWOOT_ACCOUNT_ID

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