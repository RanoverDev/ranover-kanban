require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8080;

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

app.get('/api/board', async (req, res) => {
  if (!CHATWOOT_BASE_URL || !CHATWOOT_ACCOUNT_ID || !CHATWOOT_API_TOKEN) {
    return res.status(500).json({ message: 'Variáveis de ambiente do Chatwoot não configuradas.' });
  }

  try {
    const labelsResponse = await chatwootAPI.get('/labels');
    const labels = labelsResponse.data.payload || [];

    const columnPromises = labels.map(async (label) => {
      // =======================================================
      // MUDANÇA FINAL: Adicionado status=open junto com o filtro de labels
      // =======================================================
      const endpoint = `/conversations?status=open&labels[]=${encodeURIComponent(label.title)}`;
      const conversationsResponse = await chatwootAPI.get(endpoint);
      const conversations = conversationsResponse.data.payload || [];

      return {
        id: label.title,
        title: label.title,
        color: label.color,
        cards: conversations.map(convo => ({
          id: convo.id,
          content: `Conversa com ${convo.meta.sender.name || 'Contato Desconhecido'} (#${convo.id})`,
          meta: convo.meta,
          labels: convo.labels || []
        }))
      };
    });

    const columns = await Promise.all(columnPromises);

    res.json(columns);
  } catch (error) {
    console.error('Erro ao buscar dados do Chatwoot:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Não foi possível buscar os dados do Chatwoot.' });
  }
});

app.post('/api/conversations/:conversationId/labels', async (req, res) => {
    const { conversationId } = req.params;
    const { labels } = req.body;
    try {
        await chatwootAPI.post(`/conversations/${conversationId}/labels`, { labels });
        res.status(200).json({ message: 'Etiquetas atualizadas com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar etiquetas:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Não foi possível atualizar as etiquetas no Chatwoot.' });
    }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor unificado rodando na porta ${PORT}`);
});