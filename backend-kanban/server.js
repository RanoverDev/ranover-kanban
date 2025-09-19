require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const knex = require('knex')(require('./knexfile').development);

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

// Função para buscar todas as conversas
const inboxCache = {};

const getInboxDetails = async (inboxId) => {
  if (inboxCache[inboxId]) {
    return inboxCache[inboxId];
  }
  try {
    const response = await chatwootAPI.get(`/inboxes/${inboxId}`);
    inboxCache[inboxId] = response.data;
    return response.data;
  } catch (error) {
    console.error(`Erro ao buscar detalhes da caixa de entrada ${inboxId}:`, error.message);
    return null;
  }
};

const fetchAllConversationsWithDetails = async () => {
  try {
    const conversationListResponse = await chatwootAPI.get("/conversations/search?q=");
    const conversationList = conversationListResponse.data.payload || [];
    if (conversationList.length === 0) return [];
    
    const detailedConversationPromises = conversationList.map(async convo => {
      const convoDetailsResponse = await chatwootAPI.get(`/conversations/${convo.id}`);
      const convoDetails = convoDetailsResponse.data;
      if (convoDetails.inbox_id) {
        const inboxDetails = await getInboxDetails(convoDetails.inbox_id);
        convoDetails.meta.inbox = inboxDetails; // Adiciona os detalhes da caixa de entrada ao meta
      }
      return convoDetails;
    });
    const detailedConversations = await Promise.all(detailedConversationPromises);
    
    return detailedConversations;
    
  } catch (error) {
    console.error("Erro ao buscar conversas:", error.message);
    return [];
  }
};

const mapConversationsToCards = (conversations) => {
  return conversations.map(convo => ({
    id: convo.id,
    content: `${convo.meta.sender.name || 'Contato Desconhecido'}`,
    meta: convo.meta,
    labels: convo.labels || [],
    avatar_url: convo.meta.sender.thumbnail,
    last_activity_at: convo.last_activity_at,
    unread_count: convo.unread_count,
    assignee: convo.meta.assignee ? { id: convo.meta.assignee.id, name: convo.meta.assignee.name, avatar_url: convo.meta.assignee.avatar_url } : null,
    inbox_name: convo.meta.inbox ? convo.meta.inbox.name : null
  }));
};

// Rotas API
app.get('/api/config', (req, res) => {
  res.json({
    chatwootBaseUrl: (process.env.CHATWOOT_BASE_URL || '').replace(/\/$/, ''),
    chatwootAccountId: CHATWOOT_ACCOUNT_ID
  });
});

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
    res.status(500).json({ message: 'Não foi possível buscar dados do Ranoverchat.' });
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
    res.status(500).json({ message: 'Não foi possível buscar dados do Ranoverchat.' });
  }
});

app.get('/api/board-funnel', async (req, res) => {
  try {
    const funnelStages = ['Nova', 'Sem Resposta', 'Em Andamento', 'Aguardando', 'Desqualificado', 'Cliente', 'Concluido'];
    const allLabelsResponse = await chatwootAPI.get('/labels');
    const allLabels = allLabelsResponse.data.payload || [];
    const conversations = await fetchAllConversationsWithDetails();
    const funnelData = await knex('funnel_stages').select('*');
    const columns = funnelStages.map(funnelTitle => {
      const labelData = allLabels.find(l => l.title === funnelTitle);
      return {
        id: funnelTitle,
        title: funnelTitle,
        color: labelData ? labelData.color : '#6B7280',
        cards: mapConversationsToCards(
          conversations.filter(convo => {
            const funnelEntry = funnelData.find(f => f.conversation_id === convo.id);
            return funnelEntry ? funnelEntry.stage === funnelTitle : funnelTitle === 'Nova';
          })
        )
      };
    });
    res.json(columns);
  } catch (error) {
    res.status(500).json({ message: 'Não foi possível buscar dados do funil.' });
  }
});

app.post('/api/conversations/:conversationId/labels', async (req, res) => {
  const { conversationId } = req.params;
  const { labels } = req.body;
  
  try {
    await chatwootAPI.post(`/conversations/${conversationId}/labels`, { labels });
    res.status(200).json({ message: 'Etiquetas atualizadas com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Não foi possível atualizar as etiquetas.' });
  }
});

app.post('/api/conversations/:conversationId/status', async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body;
  
  try {
    await chatwootAPI.post(`/conversations/${conversationId}/toggle_status`, { status });
    res.status(200).json({ message: 'Status atualizado com sucesso.' });
  } catch (error) { 
    res.status(500).json({ message: 'Não foi possível atualizar o status.' });
  }
});

app.post('/api/funnel/stage', async (req, res) => {
  const { conversationId, stage } = req.body;
  
  try {
    await knex('funnel_stages')
      .insert({ conversation_id: conversationId, stage: stage })
      .onConflict('conversation_id')
      .merge();
    res.status(200).json({ message: 'Estágio do funil atualizado.' });
  } catch (error) {
    res.status(500).json({ message: 'Não foi possível atualizar o estágio do funil.' });
  }
});

app.get('/api/funnel/stage/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    try {
        const result = await knex('funnel_stages')
            .where('conversation_id', conversationId)
            .first();
        
        if (result) {
            res.json({ stage: result.stage });
        } else {
            res.status(404).json({ message: 'Estágio não encontrado para esta conversa.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar estágio do funil.' });
    }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});