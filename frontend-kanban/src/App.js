import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-beautiful-dnd';
import Board from './components/Board';

const API_URL = '/api';

function App() {
  const [activeView, setActiveView] = useState('labels');
  const [allColumns, setAllColumns] = useState([]);
  const [filteredColumns, setFilteredColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [appConfig, setAppConfig] = useState(null);

  const fetchBoardData = (view) => {
    setLoading(true);
    const endpoint = view === 'labels' ? '/board' : '/board-by-status';

    axios.get(`${API_URL}${endpoint}`)
      .then(response => {
        if (Array.isArray(response.data)) {
          setAllColumns(response.data);
          setFilteredColumns(response.data);
        } else {
          console.error("A API do quadro não retornou um array:", response.data);
          setAllColumns([]);
          setFilteredColumns([]);
        }
      })
      .catch(err => { console.error(`Erro ao buscar dados para a visão ${view}!`, err); })
      .finally(() => { setLoading(false); });
  };
  
  useEffect(() => {
    const fetchInitialConfig = async () => {
      try {
        const configResponse = await axios.get(`${API_URL}/config`);
        setAppConfig(configResponse.data);
      } catch (err) {
        console.error("Erro ao carregar configuração!", err);
        setLoading(false);
      }
    };
    fetchInitialConfig();
  }, []);
  
  useEffect(() => {
    if (appConfig) {
      fetchBoardData(activeView);
    }
  }, [activeView, appConfig]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredColumns(allColumns);
      return;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const newFilteredColumns = allColumns.map(column => ({
      ...column,
      cards: column.cards.filter(card => 
        card.content.toLowerCase().includes(lowercasedFilter)
      ),
    }));
    setFilteredColumns(newFilteredColumns);
  }, [searchTerm, allColumns]);

  const onDragEnd = (result) => {
    console.log('--- onDragEnd INICIADO ---');
    console.log('Resultado do Drag:', result);
    
    const { source, destination, draggableId } = result;
    if (!destination) {
      console.log('Drag cancelado: solto fora de uma área válida.');
      return;
    }
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log('Drag cancelado: solto na mesma posição.');
      return;
    }

    console.log('Procurando pelo card movido...');
    const allColumnsCopy = JSON.parse(JSON.stringify(allColumns));
    const sourceCol = allColumnsCopy.find(col => col.id.toString() === source.droppableId);
    
    if (!sourceCol) {
        console.error('ERRO CRÍTICO: Coluna de origem não encontrada.');
        return;
    }

    const conversationId = draggableId.split('-')[0];
    const cardIndex = sourceCol.cards.findIndex(card => `${card.id}-${sourceCol.id}` === draggableId);
    
    console.log(`Índice do card encontrado: ${cardIndex}`);

    if (cardIndex === -1) {
      console.error('ERRO CRÍTICO: Não foi possível encontrar o card arrastado no estado. A função será interrompida.');
      return;
    }

    const [movedCard] = sourceCol.cards.splice(cardIndex, 1);
    const destCol = allColumnsCopy.find(col => col.id.toString() === destination.droppableId);
    destCol.cards.splice(destination.index, 0, movedCard);
    
    console.log('Atualizando o estado da UI otimisticamente...');
    setAllColumns(allColumnsCopy);

    console.log('Verificando a visão ativa:', activeView);
    if (activeView === 'labels') {
      const newLabels = (movedCard.labels || []).filter(label => label !== source.droppableId);
      if (!newLabels.includes(destination.droppableId)) { newLabels.push(destination.droppableId); }
      
      console.log(`Enviando requisição para ATUALIZAR ETIQUETAS para a conversa #${conversationId} com as etiquetas:`, newLabels);
      axios.post(`${API_URL}/conversations/${conversationId}/labels`, { labels: newLabels })
        .catch(err => { console.error("Falha ao atualizar etiquetas", err); fetchBoardData(activeView); });

    } else if (activeView === 'status') {
      const newStatus = destination.droppableId;
      console.log(`Enviando requisição para ATUALIZAR STATUS para a conversa #${conversationId} com o status:`, newStatus);
      axios.post(`${API_URL}/conversations/${conversationId}/status`, { status: newStatus })
        .catch(err => { console.error("Falha ao atualizar status", err); fetchBoardData(activeView); });
    }
    console.log('--- onDragEnd FINALIZADO ---');
  };

  return (
    // ... O JSX do return permanece o mesmo da versão completa anterior ...
    // Vou incluir abaixo para garantir 100% de integridade.
    <div className="h-screen bg-slate-100 font-sans text-sm flex flex-col">
      <header className="p-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex space-x-2">
                <button onClick={() => setActiveView('labels')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'labels' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    Quadro por Etiquetas
                </button>
                <button onClick={() => setActiveView('status')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'status' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    Quadro por Status
                </button>
            </div>
            <div className="w-1/3">
                <input
                    type="text"
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded-md border border-slate-300"
                />
            </div>
        </div>
      </header>
      
      <main className="flex-grow overflow-hidden">
        {loading || !appConfig ? (
          <div className="flex justify-center items-center h-full"><p>Carregando configuração e dados...</p></div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Board columns={filteredColumns} activeView={activeView} config={appConfig} />
          </DragDropContext>
        )}
      </main>
    </div>
  );
}

export default App;