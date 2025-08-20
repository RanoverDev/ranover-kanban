const express = require('express');
const cors = require('cors');
const knex = require('knex')(require('./knexfile').development);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rota para buscar o quadro completo (colunas com seus cards)
app.get('/api/board', async (req, res) => {
  try {
    const columns = await knex('columns').orderBy('order');
    const cards = await knex('cards').orderBy('order');
    
    const columnsWithCards = columns.map(column => ({
      ...column,
      cards: cards.filter(card => card.column_id === column.id)
    }));

    res.json(columnsWithCards);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching board data', error: err });
  }
});

// Rota para mover um card
app.put('/api/cards/:id/move', async (req, res) => {
  const { id } = req.params;
  const { newColumnId, newOrder } = req.body;

  try {
    await knex('cards').where({ id }).update({
      column_id: newColumnId,
      order: newOrder,
    });
    // Lógica para reordenar outros cards seria necessária aqui em um app complexo
    res.status(200).json({ message: 'Card moved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error moving card', error: err });
  }
});

// Rota para adicionar um novo card
app.post('/api/cards', async (req, res) => {
    const { content, column_id, order } = req.body;
    try {
        const [newCard] = await knex('cards').insert({ content, column_id, order }).returning('*');
        res.status(201).json(newCard);
    } catch (err) {
        res.status(500).json({ message: 'Error creating card', error: err });
    }
});

// Rota para deletar um card
app.delete('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedCount = await knex('cards').where({ id }).del();
    if (deletedCount > 0) {
      res.status(200).json({ message: 'Card deletado com sucesso' });
    } else {
      res.status(404).json({ message: 'Card não encontrado' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Erro ao deletar o card', error: err });
  }
});


app.listen(PORT, async () => {
    // Roda as migrations na inicialização para garantir que o DB esteja atualizado
    await knex.migrate.latest();
    console.log(`Backend server running on http://localhost:${PORT}`);
});