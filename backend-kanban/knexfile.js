require('dotenv').config(); // Para usar variáveis de ambiente

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL, // Lê a URL do ambiente
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  }
};