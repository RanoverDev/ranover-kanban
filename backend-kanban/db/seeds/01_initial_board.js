// backend-kanban/db/seeds/01_initial_board.js

exports.seed = async function(knex) {
  // Deleta dados existentes para evitar duplicatas ao rodar o seed várias vezes
  await knex('cards').del();
  await knex('columns').del();

  // Insere as colunas e captura os IDs gerados
  const [todoId] = await knex('columns').insert({ title: 'A Fazer', order: 0 }).returning('id');
  const [doingId] = await knex('columns').insert({ title: 'Em Andamento', order: 1 }).returning('id');
  const [doneId] = await knex('columns').insert({ title: 'Concluído', order: 2 }).returning('id');

  // Insere alguns cards de exemplo
  await knex('cards').insert([
    { content: 'Configurar ambiente de desenvolvimento', column_id: todoId.id, order: 0 },
    { content: 'Criar componentes React', column_id: todoId.id, order: 1 },
    { content: 'Conectar frontend com o backend', column_id: doingId.id, order: 0 },
    { content: 'Testar funcionalidade de drag-and-drop', column_id: doneId.id, order: 0 }
  ]);
};