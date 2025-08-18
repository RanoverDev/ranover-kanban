exports.up = function(knex) {
  return knex.schema
    .createTable('columns', table => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.integer('order').notNullable();
    })
    .createTable('cards', table => {
      table.increments('id').primary();
      table.string('content').notNullable();
      table.integer('column_id').unsigned().references('id').inTable('columns').onDelete('CASCADE');
      table.integer('order').notNullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('cards')
    .dropTableIfExists('columns');
};