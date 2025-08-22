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

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const configPromise = axios.get(`${API_URL}/config`);
        const endpoint = activeView === 'labels' ? '/board' : '/board-by-status';
        const boardPromise = axios.get(`${API_URL}${endpoint}`);
        
        const [configResponse, boardResponse] = await Promise.all([configPromise, boardPromise]);
        
        setAppConfig(configResponse.data);

        if (Array.isArray(boardResponse.data)) {
          setAllColumns(boardResponse.data);
          setFilteredColumns(boardResponse.data);
        } else {
          console.error("A API do quadro não retornou um array:", boardResponse.data);
          setAllColumns([]);
          setFilteredColumns([]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados iniciais!", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [activeView]);

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
    const { source, destination, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const allColumnsCopy = JSON.parse(JSON.stringify(allColumns));
    const sourceCol = allColumnsCopy.find(col => col.id.toString() === source.droppableId);
    const conversationId = draggableId.split('-')[0];
    const cardIndex = sourceCol.cards.findIndex(card => `${card.id}-${sourceCol.id}` === draggableId);
    
    if (cardIndex === -1) return;

    const [movedCard] = sourceCol.cards.splice(cardIndex, 1);
    const destCol = allColumnsCopy.find(col => col.id.toString() === destination.droppableId);
    destCol.cards.splice(destination.index, 0, movedCard);
    
    setAllColumns(allColumnsCopy);

    if (activeView === 'labels') {
      const newLabels = (movedCard.labels || []).filter(label => label !== source.droppableId);
      if (!newLabels.includes(destination.droppableId)) {
        newLabels.push(destination.droppableId);
      }
      axios.post(`${API_URL}/conversations/${conversationId}/labels`, { labels: newLabels })
        .catch(err => { console.error("Falha ao atualizar etiquetas", err); fetchInitialData(); });
    } else if (activeView === 'status') {
      axios.post(`${API_URL}/conversations/${conversationId}/status`, { status: destination.droppableId })
        .catch(err => { console.error("Falha ao atualizar status", err); fetchInitialData(); });
    }
  };

  return (
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