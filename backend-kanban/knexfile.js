// backend-kanban/knexfile.js

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './kanban.db'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    },
    // ADICIONE ESTA SEÇÃO
    seeds: {
      directory: './db/seeds'
    }
  }
};