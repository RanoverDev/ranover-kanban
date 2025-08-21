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
    // 1. Busca as etiquetas (colunas)
    const labelsResponse = await chatwootAPI.get('/labels');
    const labels = labelsResponse.data.payload || [];

    // 2. Busca a lista inicial de conversas
    const conversationListResponse = await chatwootAPI.get('/conversations/search');
    const conversationList = conversationListResponse.data.payload || [];

    // 3. Para cada conversa, busca seus detalhes completos para obter as etiquetas
    const detailedConversationPromises = conversationList.map(convo =>
      chatwootAPI.get(`/conversations/${convo.id}`)
    );
    const detailedConversationResponses = await Promise.all(detailedConversationPromises);
    const conversations = detailedConversationResponses.map(response => response.data);

    console.log(`--- DADOS FINAIS ---`);
    console.log(`Encontradas ${labels.length} etiquetas e ${conversations.length} conversas com detalhes completos.`);

    // 4. A partir daqui, a lógica de associação funciona como esperado
    const columns = labels.map(label => ({
      id: label.title,
      title: label.title,
      color: label.color,
      cards: conversations
        .filter(convo => convo.labels && convo.labels.includes(label.title))
        .map(convo => ({
          id: convo.id,
          content: `Conversa com ${convo.meta.sender.name || 'Contato Desconhecido'} (#${convo.id})`,
          meta: convo.meta,
          labels: convo.labels || []
        }))
    }));

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