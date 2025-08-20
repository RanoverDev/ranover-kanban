const express = require('express');
const cors = require('cors');
const path = require('path'); // Módulo nativo do Node.js
const knex = require('knex')(require('./knexfile').development);

const app = express();
// A plataforma vai nos dar a porta, ou usamos 8080 para teste
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// =======================================================
// NOVAS ROTAS PARA SERVIR O FRONTEND
// =======================================================
// 1. Serve os arquivos estáticos (JS, CSS, imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// =======================================================
// ROTAS DA API (DEVEM VIR ANTES DO CATCH-ALL)
// =======================================================
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
    res.status(500).json({ message: 'Error fetching board data', error: err.message });
  }
});

// Suas outras rotas da API (POST, PUT, DELETE para cards) continuam aqui...
// ... (vou omitir para economizar espaço, mas mantenha as suas)

// =======================================================
// ROTA "CATCH-ALL" (CORINGA)
// =======================================================
// 2. Para qualquer outra requisição GET que não seja uma API,
//    devolve o index.html do frontend. Essencial para o React Router.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, async () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});