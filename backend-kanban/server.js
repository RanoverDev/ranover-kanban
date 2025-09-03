require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const knex = require('knex')(require('./knexfile').development);
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

// Variável para armazenar o último timestamp de verificação
let lastCheckTimestamp = Date.now();

// Configurar WebSocket
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('💥 Erro no WebSocket:', error);
  });
});

// Função para emitir atualizações
const emitConversationUpdate = (conversationId) => {
  console.log('📤 Emitindo evento para conversa:', conversationId);
  console.log('👥 Clientes conectados:', io.engine.clientsCount);
  
  io.emit('conversationUpdated', {
    conversationId,
    timestamp: new Date().toISOString(),
    message: `Conversa ${conversationId} atualizada`
  });
};

// Função ORIGINAL para carregamento inicial
const fetchAllConversationsWithDetails = async () => {
  try {
    const conversationListResponse = await chatwootAPI.get('/conversations/search?q=');
    const conversationList = conversationListResponse.data.payload || [];
    if (conversationList.length === 0) return [];
    
    const detailedConversationPromises = conversationList.map(convo => 
      chatwootAPI.get(`/conversations/${convo.id}`)
    );
    const detailedConversationResponses = await Promise.all(detailedConversationPromises);
    
    return detailedConversationResponses.map(response => response.data);
    
  } catch (error) {
    console.error('Erro ao buscar conversas:', error.message);
    return [];
  }
};

// Função OTIMIZADA para polling (busca apenas atualizadas)
const fetchUpdatedConversations = async () => {
  try {
    const conversationListResponse = await chatwootAPI.get('/conversations/search?q=');
    const conversationList = conversationListResponse.data.payload || [];
    if (conversationList.length === 0) return [];
    
    // Busca apenas informações básicas para comparação
    const conversationsBasicInfo = conversationList.map(convo => ({
      id: convo.id,
      last_activity_at: convo.last_activity_at,
      updated_at: convo.updated_at
    }));

    // Filtra apenas as conversas que podem estar atualizadas
    const potentiallyUpdated = conversationsBasicInfo.filter(convo => {
      const convoDate = new Date(convo.last_activity_at * 1000);
      return convoDate > new Date(lastCheckTimestamp - 30000);
    });

    if (potentiallyUpdated.length === 0) return [];

    // Busca detalhes apenas das conversas potencialmente atualizadas
    const detailedPromises = potentiallyUpdated.map(convo => 
      chatwootAPI.get(`/conversations/${convo.id}`)
    );
    const detailedResponses = await Promise.all(detailedPromises);
    
    return detailedResponses.map(response => response.data);
    
  } catch (error) {
    console.error('Erro ao buscar conversas atualizadas:', error.message);
    return [];
  }
};

// Função para verificar conversas atualizadas
const checkForUpdatedConversations = async () => {
  try {
    console.log('🔍 Verificando conversas atualizadas...');
    
    const conversations = await fetchUpdatedConversations();
    const updatedConversations = conversations.filter(convo => {
      const convoDate = new Date(convo.last_activity_at * 1000);
      return convoDate > new Date(lastCheckTimestamp);
    });

    if (updatedConversations.length > 0) {
      console.log(`🔄 ${updatedConversations.length} conversa(s) atualizada(s)`);
      updatedConversations.forEach(convo => {
        emitConversationUpdate(convo.id);
      });
    }

    lastCheckTimestamp = Date.now();
    
  } catch (error) {
    console.error('Erro ao verificar atualizações:', error);
  }
};

// Inicia o polling a cada 15 segundos
setInterval(checkForUpdatedConversations, 15000);

const mapConversationsToCards = (conversations) => {
  return conversations.map(convo => ({
    id: convo.id,
    content: `${convo.meta.sender.name || 'Contato Desconhecido'}`,
    meta: convo.meta,
    labels: convo.labels || [],
    avatar_url: convo.meta.sender.thumbnail,
    last_activity_at: convo.last_activity_at,
    unread_count: convo.unread_count
  }));
};

// Rotas API
app.get('/api/config', (req, res) => {
  res.json({
    chatwootBaseUrl: (process.env.CHATWOOT_BASE_URL || '').replace(/\/$/, ''),
    chatwootAccountId: CHATWOOT_ACCOUNT_ID
  });
});

app.get('/api/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const response = await chatwootAPI.get(`/conversations/${conversationId}`);
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar conversa individual:', error);
    res.status(500).json({ error: 'Não foi possível buscar a conversa' });
  }
});

app.get('/api/board', async (req, res) => {
  try {
    const labelsResponse = await chatwootAPI.get('/labels');
    const labels = labelsResponse.data.payload || [];
    const conversations = await fetchAllConversationsWithDetails(); // Usa a função ORIGINAL
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
    console.error('Erro no /api/board:', error.message);
    res.status(500).json({ message: 'Não foi possível buscar dados do Chatwoot.' }); 
  }
});

app.get('/api/board-by-status', async (req, res) => {
  try {
    const statuses = ['open', 'pending', 'resolved'];
    const statusLabels = { open: 'Abertas', pending: 'Pendentes', resolved: 'Resolvidas' };
    const conversations = await fetchAllConversationsWithDetails(); // Usa a função ORIGINAL
    const columns = statuses.map(status => ({
      id: status,
      title: statusLabels[status],
      cards: mapConversationsToCards(
        conversations.filter(convo => convo.status === status)
      )
    }));
    res.json(columns);
  } catch (error) { 
    console.error('Erro no /api/board-by-status:', error.message);
    res.status(500).json({ message: 'Não foi possível buscar dados do Chatwoot.' }); 
  }
});

app.get('/api/board-funnel', async (req, res) => {
  try {
    const funnelStages = ['Nova', 'Sem Resposta', 'Em Andamento', 'Aguardando', 'Desqualificado', 'Cliente', 'Concluido'];
    const allLabelsResponse = await chatwootAPI.get('/labels');
    const allLabels = allLabelsResponse.data.payload || [];
    const conversations = await fetchAllConversationsWithDetails(); // Usa a função ORIGINAL
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
    console.error('Erro no /api/board-funnel:', error.message);
    res.status(500).json({ message: 'Não foi possível buscar dados do funil.' }); 
  }
});

// Endpoints POST (mantidos iguais)
app.post('/api/conversations/:conversationId/labels', async (req, res) => {
  const { conversationId } = req.params;
  const { labels } = req.body;
  
  try {
    console.log('🏷️ Atualizando labels da conversa:', conversationId, labels);
    await chatwootAPI.post(`/conversations/${conversationId}/labels`, { labels });
    emitConversationUpdate(conversationId);
    res.status(200).json({ message: 'Etiquetas atualizadas com sucesso.' });
  } catch (error) { 
    console.error('Erro ao atualizar labels:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Não foi possível atualizar as etiquetas.',
      error: error.message 
    }); 
  }
});

app.post('/api/conversations/:conversationId/status', async (req, res) => {
  const { conversationId } = req.params;
  const { status } = req.body;
  
  try {
    console.log('🔄 Atualizando status da conversa:', conversationId, status);
    await chatwootAPI.post(`/conversations/${conversationId}/toggle_status`, { status });
    emitConversationUpdate(conversationId);
    res.status(200).json({ message: 'Status atualizado com sucesso.' });
  } catch (error) { 
    console.error('Erro ao atualizar status:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Não foi possível atualizar o status.',
      error: error.message 
    }); 
  }
});

app.post('/api/funnel/stage', async (req, res) => {
  const { conversationId, stage } = req.body;
  
  try {
    console.log('🎯 Atualizando estágio do funil:', conversationId, stage);
    await knex('funnel_stages')
      .insert({ conversation_id: conversationId, stage: stage })
      .onConflict('conversation_id')
      .merge();
    emitConversationUpdate(conversationId);
    res.status(200).json({ message: 'Estágio do funil atualizado.' });
  } catch (error) { 
    console.error('Erro ao atualizar estágio do funil:', error.message);
    res.status(500).json({ 
      message: 'Não foi possível atualizar o estágio do funil.',
      error: error.message 
    }); 
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    websocketClients: io.engine.clientsCount,
    lastCheckTimestamp: new Date(lastCheckTimestamp).toISOString(),
    status: 'OK'
  });
});

app.get('*', (req, res) => { 
  res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} com WebSockets`);
  console.log(`🌐 WebSocket disponível em: http://localhost:${PORT}`);
  console.log(`⏰ Polling inteligente iniciado (15 segundos)`);
});