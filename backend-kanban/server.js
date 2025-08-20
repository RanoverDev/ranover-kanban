const express = require('express');
const cors = require('cors');
const path = require('path');
const knex = require('knex')(require('./knexfile').development);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Serve os arquivos estáticos do frontend da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// =======================================================
// ROTAS DA API
// =======================================================

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
    res.status(500).json({ message: 'Erro ao buscar dados do quadro', error: err.message });
  }
});

// Rota para adicionar um novo card
app.post('/api/cards', async (req, res) => {
    const { content, column_id, order } = req.body;
    try {
        const [newCard] = await knex('cards').insert({ content, column_id, order }).returning('*');
        res.status(201).json(newCard);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar o card', error: err });
    }
});

// Rota para mover um card (drag & drop)
app.put('/api/cards/:id/move', async (req, res) => {
  const { id } = req.params;
  const { newColumnId, newOrder } = req.body;

  try {
    await knex('cards').where({ id }).update({
      column_id: newColumnId,
      order: newOrder,
    });
    res.status(200).json({ message: 'Card movido com sucesso' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao mover o card', error: err });
  }
});

// Rota para editar o conteúdo de um card
app.put('/api/cards/:id', async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'O conteúdo não pode ser vazio' });
  }

  try {
    const updatedCount = await knex('cards').where({ id }).update({ content });
    if (updatedCount > 0) {
      const updatedCard = await knex('cards').where({ id }).first();
      res.status(200).json(updatedCard);
    } else {
      res.status(404).json({ message: 'Card não encontrado' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Erro ao atualizar o card', error: err });
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


// =======================================================
// ROTA "CATCH-ALL" PARA O FRONTEND
// =======================================================
// Para qualquer outra requisição GET, devolve o index.html do frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
    // A inicialização do banco (migrations/seeds) foi movida para o entrypoint.sh
    console.log(`Servidor unificado rodando na porta ${PORT}`);
});