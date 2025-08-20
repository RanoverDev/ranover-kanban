// backend-kanban/server.js (versão Chatwoot API)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios'); // Para chamadas de API

const app = express();
const PORT = process.env.PORT || 8080;

// Configuração da API do Chatwoot
const CHATWOOT_BASE_URL = process.env.CHATWOOT_BASE_URL;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN;

const chatwootAPI = axios.create({
  baseURL: `${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}`,
  headers: {
    'api_access_token': CHATWOOT_API_TOKEN,
    'Content-Type': 'application/json; charset=utf-8'
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// =======================================================
// NOVA ROTA DA API: Busca dados do Chatwoot
// =======================================================
app.get('/api/board', async (req, res) => {
  if (!CHATWOOT_BASE_URL || !CHATWOOT_ACCOUNT_ID || !CHATWOOT_API_TOKEN) {
    return res.status(500).json({ message: 'Variáveis de ambiente do Chatwoot não configuradas.' });
  }

  try {
    // 1. Busca todas as etiquetas (labels) para usar como colunas
    const labelsResponse = await chatwootAPI.get('/labels');
    const labels = labelsResponse.data;

    // 2. Busca as conversas com status "open"
    const conversationsResponse = await chatwootAPI.get('/conversations?status=open');
    const conversations = conversationsResponse.data.payload;

    // 3. Monta a estrutura do quadro
    const columns = labels.map(label => ({
      id: label.title, // Usa o título da etiqueta como um ID único para o quadro
      title: label.title,
      color: label.color, // Podemos usar a cor da etiqueta no futuro
      cards: conversations
        .filter(convo => convo.labels.includes(label.title))
        .map(convo => ({
          id: convo.id, // ID da conversa
          content: `Conversa com ${convo.meta.sender.name || 'Contato Desconhecido'}`,
          meta: convo.meta // Inclui metadados para mostrar mais detalhes no card
        }))
    }));

    res.json(columns);
  } catch (error) {
    console.error('Erro ao buscar dados do Chatwoot:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Não foi possível buscar os dados do Chatwoot.' });
  }
});

// Rota para atualizar as etiquetas de uma conversa (ação de arrastar)
app.post('/api/conversations/:conversationId/labels', async (req, res) => {
    const { conversationId } = req.params;
    const { labels } = req.body; // Espera um array de títulos de etiquetas, ex: ["Triagem", "Prioridade"]

    try {
        await chatwootAPI.post(`/conversations/${conversationId}/labels`, { labels });
        res.status(200).json({ message: 'Etiquetas atualizadas com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar etiquetas:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Não foi possível atualizar as etiquetas no Chatwoot.' });
    }
});


// Rota "Catch-all" para o frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor unificado rodando na porta ${PORT}`);
});