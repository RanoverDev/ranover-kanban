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

// ROTA ANTIGA: Quadro por Etiquetas
app.get('/api/board', async (req, res) => {
  // ... (código existente, sem alterações)
});

// =======================================================
// NOVA ROTA: Quadro por Status
// =======================================================
app.get('/api/board-by-status', async (req, res) => {
  if (!CHATWOOT_BASE_URL || !CHATWOOT_ACCOUNT_ID || !CHATWOOT_API_TOKEN) {
    return res.status(500).json({ message: 'Variáveis de ambiente do Chatwoot não configuradas.' });
  }

  try {
    const statuses = ['open', 'pending', 'resolved']; // Status que queremos como colunas
    const statusLabels = { open: 'Abertas', pending: 'Pendentes', resolved: 'Resolvidas' };

    const conversationPromises = statuses.map(status => chatwootAPI.get(`/conversations?status=${status}`));
    const conversationResponses = await Promise.all(conversationPromises);

    const columns = conversationResponses.map((response, index) => {
      const status = statuses[index];
      const conversations = response.data.payload || [];
      return {
        id: status,
        title: statusLabels[status],
        cards: conversations.map(convo => ({
          id: convo.id,
          content: `Conversa com ${convo.meta.sender.name || 'Contato Desconhecido'} (#${convo.id})`,
          meta: convo.meta,
          labels: convo.labels || [],
          avatar_url: convo.meta.sender.thumbnail
        }))
      };
    });

    res.json(columns);
  } catch (error) {
    console.error('Erro ao buscar dados do Chatwoot por status:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Não foi possível buscar os dados do Chatwoot.' });
  }
});


app.post('/api/conversations/:conversationId/labels', async (req, res) => {
    // ... (código existente, sem alterações)
});

// =======================================================
// NOVA ROTA: Atualizar Status da Conversa
// =======================================================
app.post('/api/conversations/:conversationId/status', async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body;

  try {
    await chatwootAPI.post(`/conversations/${conversationId}/toggle_status`, { status });
    res.status(200).json({ message: 'Status atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Não foi possível atualizar o status no Chatwoot.' });
  }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor unificado rodando na porta ${PORT}`);
});