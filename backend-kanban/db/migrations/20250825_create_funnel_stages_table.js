// backend-kanban/db/migrations/20250825_create_funnel_stages_table.js

exports.up = function(knex) {
    return knex.schema.createTable('funnel_stages', function(table) {
        table.integer('conversation_id').primary(); // ID da conversa do Chatwoot
        table.string('stage').notNullable();       // Ex: 'Nova', 'Em Andamento'
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    };

    exports.down = function(knex) {
    return knex.schema.dropTable('funnel_stages');
    };