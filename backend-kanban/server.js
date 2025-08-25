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
  headers: { 'api_access_token': CHATWOOT_API_TOKEN, 'Content-Type': 'application/json; charset=utf-8' }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    chatwootBaseUrl: CHATWOOT_BASE_URL,
    chatwootAccountId: CHATWOOT_ACCOUNT_ID
  });
});

const fetchAllConversationsWithDetails = async () => {
  const conversationListResponse = await chatwootAPI.get('/conversations/search?q=');
  const conversationList = conversationListResponse.data.payload || [];
  if (conversationList.length === 0) return [];
  const detailedConversationPromises = conversationList.map(convo => chatwootAPI.get(`/conversations/${convo.id}`));
  const detailedConversationResponses = await Promise.all(detailedConversationPromises);
  return detailedConversationResponses.map(response => response.data);
};

const mapConversationsToCards = (conversations) => {
  return conversations.map(convo => ({
    id: convo.id,
    content: `Conversa com ${convo.meta.sender.name || 'Contato Desconhecido'} (#${convo.id})`,
    meta: convo.meta,
    labels: convo.labels || [],
    avatar_url: convo.meta.sender.thumbnail
  }));
};

app.get('/api/board', async (req, res) => {
  try {
    const labelsResponse = await chatwootAPI.get('/labels');
    const labels = labelsResponse.data.payload || [];
    const conversations = await fetchAllConversationsWithDetails();
    const columns = labels.map(label => ({
      id: label.title,
      title: label.title,
      color: label.color,
      cards: mapConversationsToCards(
        conversations.filter(convo => convo.labels && convo.labels.includes(label.title))
      )
    }));
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: 'Não foi possível buscar dados do Chatwoot.' });
  }
});

app.get('/api/board-by-status', async (req, res) => {
  try {
    const statuses = ['open', 'pending', 'resolved'];
    const statusLabels = { open: 'Abertas', pending: 'Pendentes', resolved: 'Resolvidas' };
    const conversations = await fetchAllConversationsWithDetails();
    const columns = statuses.map(status => ({
      id: status,
      title: statusLabels[status],
      cards: mapConversationsToCards(
        conversations.filter(convo => convo.status === status)
      )
    }));
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: 'Não foi possível buscar dados do Chatwoot.' });
  }
});

app.post('/api/conversations/:conversationId/labels', async (req, res) => {
    const { conversationId } = req.params;
    const { labels } = req.body;
    try {
        await chatwootAPI.post(`/conversations/${conversationId}/labels`, { labels });
        res.status(200).json({ message: 'Etiquetas atualizadas com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Não foi possível atualizar as etiquetas no Chatwoot.' });
    }
});

app.post('/api/conversations/:conversationId/status', async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body;
  try {
    await chatwootAPI.post(`/conversations/${conversationId}/toggle_status`, { status });
    res.status(200).json({ message: 'Status atualizado com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Não foi possível atualizar o status no Chatwoot.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor unificado rodando na porta ${PORT}`);
});