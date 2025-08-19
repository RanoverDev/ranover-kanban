# deploy/backend.Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copia os arquivos de dependência e instala
COPY backend-kanban/package*.json ./
RUN npm install

# Copia o resto do código da aplicação
COPY backend-kanban/ .

# Copia o nosso novo script de inicialização para dentro do container
COPY deploy/backend-entrypoint.sh /app/backend-entrypoint.sh

# **IMPORTANTE**: Dá permissão de execução ao script
RUN chmod +x /app/backend-entrypoint.sh

# Expõe a porta que o backend usa
EXPOSE 3001

# Define o script como o comando de entrada do container
ENTRYPOINT ["/app/backend-entrypoint.sh"]