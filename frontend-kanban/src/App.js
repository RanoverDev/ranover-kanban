import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-beautiful-dnd';
import Board from './components/Board';

const API_URL = '/api';

function App() {
  const [activeView, setActiveView] = useState('labels');
  const [allColumns, setAllColumns] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
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
        } else {
          setAllColumns([]);
        }
      })
      .catch(err => { console.error(`Erro ao buscar dados para a visão ${view}!`, err); })
      .finally(() => { setLoading(false); });
  };

  useEffect(() => {
    const fetchInitialSetup = async () => {
      setLoading(true);
      try {
        const [configRes, labelsRes] = await Promise.all([
          axios.get(`${API_URL}/config`),
          axios.get(`${API_URL}/board`) // Busca as etiquetas para a lógica de cores
        ]);
        setAppConfig(configRes.data);
        if (Array.isArray(labelsRes.data)) {
          setAllLabels(labelsRes.data);
        }
      } catch (err) {
        console.error("Erro ao carregar configuração ou etiquetas!", err);
      } finally {
        fetchBoardData(activeView); // Busca os dados do quadro ativo após a config
      }
    };
    fetchInitialSetup();
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
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

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
      if (!newLabels.includes(destination.droppableId)) newLabels.push(destination.droppableId);
      axios.post(`${API_URL}/conversations/${conversationId}/labels`, { labels: newLabels })
        .catch(err => { console.error("Falha ao atualizar etiquetas", err); fetchBoardData(activeView); });
    } else if (activeView === 'status') {
      axios.post(`${API_URL}/conversations/${conversationId}/status`, { status: destination.droppableId })
        .catch(err => { console.error("Falha ao atualizar status", err); fetchBoardData(activeView); });
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
                    Status do Chatwoot
                </button>
            </div>
            <div className="w-1/3">
                <input type="text" placeholder="Buscar conversas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 rounded-md border border-slate-300"/>
            </div>
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
        {loading || !appConfig ? (
          <div className="flex justify-center items-center h-full"><p>Carregando dados do Chatwoot...</p></div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Board columns={filteredColumns} activeView={activeView} config={appConfig} allLabels={allLabels} />
          </DragDropContext>
        )}
      </main>
    </div>
  );
}

export default App;