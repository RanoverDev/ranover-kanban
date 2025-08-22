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

  useEffect(() => {
    fetchBoardData(activeView);
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

  const fetchBoardData = (view) => {
    setLoading(true);
    setFilteredColumns([]);
    setAllColumns([]);

    const endpoint = view === 'labels' ? '/board' : '/board-by-status';
    axios.get(`${API_URL}${endpoint}`)
      .then(response => {
        if (Array.isArray(response.data)) {
          setAllColumns(response.data);
          setFilteredColumns(response.data);
        } else {
          console.error("A resposta da API não continha uma lista de colunas:", response.data);
          setAllColumns([]);
          setFilteredColumns([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(`Erro ao buscar dados para a visão ${view}!`, err);
        setLoading(false);
      });
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // A lógica de atualização da UI agora é mais robusta
    setAllColumns(prevColumns => {
      const newColumns = JSON.parse(JSON.stringify(prevColumns)); // Cópia profunda
      const sourceCol = newColumns.find(col => col.id.toString() === source.droppableId);
      const conversationId = draggableId.split('-')[0];
      const cardIndex = sourceCol.cards.findIndex(card => `${card.id}-${sourceCol.id}` === draggableId);
      
      if (cardIndex === -1) return prevColumns; // Não encontrou o card, não faz nada

      const [movedCard] = sourceCol.cards.splice(cardIndex, 1);
      const destCol = newColumns.find(col => col.id.toString() === destination.droppableId);
      destCol.cards.splice(destination.index, 0, movedCard);
      
      // Chama a API correspondente à visão ativa
      if (activeView === 'labels') {
        const newLabels = (movedCard.labels || []).filter(label => label !== source.droppableId);
        if (!newLabels.includes(destination.droppableId)) {
          newLabels.push(destination.droppableId);
        }
        axios.post(`${API_URL}/conversations/${conversationId}/labels`, { labels: newLabels })
          .catch(err => { console.error("Falha ao atualizar etiquetas", err); fetchBoardData(activeView); });
      } else if (activeView === 'status') {
        axios.post(`${API_URL}/conversations/${conversationId}/status`, { status: destination.droppableId })
          .catch(err => { console.error("Falha ao atualizar status", err); fetchBoardData(activeView); });
      }
      
      return newColumns;
    });
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
        {loading ? (
          <div className="flex justify-center items-center h-full"><p>Carregando quadro...</p></div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Board columns={filteredColumns} activeView={activeView} />
          </DragDropContext>
        )}
      </main>
    </div>
  );
}

export default App;