# deploy/frontend.Dockerfile

# Estágio 1: Build da aplicação React
FROM node:18-alpine AS build
WORKDIR /app
COPY frontend-kanban/package*.json ./
RUN npm install
COPY frontend-kanban/ .

# =======================================================
# ADICIONE ESTA LINHA PARA CORRIGIR O PROBLEMA DE PERMISSÃO
RUN chmod +x -R ./node_modules/.bin
# =======================================================

RUN npm run build

# Estágio 2: Servidor de produção com Nginx
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]