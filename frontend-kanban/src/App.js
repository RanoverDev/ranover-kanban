import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-beautiful-dnd';
import Board from './components/Board'; // Importaremos o componente do quadro

const API_URL = '/api';

function App() {
  const [activeView, setActiveView] = useState('labels'); // 'labels' ou 'status'
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState([]);

  useEffect(() => {
    fetchBoardData(activeView);
  }, [activeView]);

  useEffect(() => {
    // Lógica de filtro do campo de busca
    if (!searchTerm) {
      setFilteredColumns(columns);
      return;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const newFilteredColumns = columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => 
        card.content.toLowerCase().includes(lowercasedFilter)
      ),
    }));
    setFilteredColumns(newFilteredColumns);
  }, [searchTerm, columns]);

  const fetchBoardData = (view) => {
    setLoading(true);
    const endpoint = view === 'labels' ? '/board' : '/board-by-status';
    axios.get(`${API_URL}${endpoint}`)
      .then(response => {
        setColumns(response.data);
        setFilteredColumns(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(`Erro ao buscar dados para a visão ${view}!`, err);
        setLoading(false);
      });
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId)) {
      // (Lógica para reordenar dentro da mesma coluna pode ser adicionada aqui no futuro)
      return;
    }
    
    // Lógica para atualizar a UI otimisticamente
    const allColumnsCopy = [...columns];
    const sourceCol = allColumnsCopy.find(col => col.id.toString() === source.droppableId);
    const cardIdToMove = draggableId.split('-')[0];
    const cardIndex = sourceCol.cards.findIndex(card => `${card.id}-${sourceCol.id}` === draggableId);
    if(cardIndex === -1) return;
    const [movedCard] = sourceCol.cards.splice(cardIndex, 1);
    const destCol = allColumnsCopy.find(col => col.id.toString() === destination.droppableId);
    destCol.cards.splice(destination.index, 0, movedCard);
    setColumns(allColumnsCopy);

    // Chama a API correta dependendo da visão ativa
    if (activeView === 'labels') {
      const newLabels = (movedCard.labels || []).filter(label => label !== source.droppableId);
      newLabels.push(destination.droppableId);
      axios.post(`${API_URL}/conversations/${cardIdToMove}/labels`, { labels: newLabels })
        .catch(err => { console.error("Falha ao atualizar etiquetas", err); fetchBoardData(activeView); });
    } else if (activeView === 'status') {
      axios.post(`${API_URL}/conversations/${cardIdToMove}/status`, { status: destination.droppableId })
        .catch(err => { console.error("Falha ao atualizar status", err); fetchBoardData(activeView); });
    }
  };

  return (
    <div className="h-screen bg-slate-100 font-sans text-sm flex flex-col">
      {/* NAVEGAÇÃO DE ABAS E BUSCA */}
      <header className="p-4 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
            {/* ABAS */}
            <div className="flex space-x-2">
                <button onClick={() => setActiveView('labels')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'labels' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    Quadro por Etiquetas
                </button>
                <button onClick={() => setActiveView('status')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'status' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    Quadro por Status
                </button>
            </div>
            {/* BUSCA */}
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
      
      {/* RENDERIZA O QUADRO */}
      <main className="flex-grow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-full"><p>Carregando quadro...</p></div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Board columns={filteredColumns} />
          </DragDropContext>
        )}
      </main>
    </div>
  );
}

export default App;