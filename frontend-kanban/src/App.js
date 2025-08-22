import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-beautiful-dnd';
import Board from './components/Board';

const API_URL = '/api';

function App() {
  const [activeView, setActiveView] = useState('labels');
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColumns, setFilteredColumns] = useState([]);

  useEffect(() => {
    fetchBoardData(activeView);
  }, [activeView]);

  useEffect(() => {
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
    setFilteredColumns([]); // Limpa as colunas enquanto carrega
    setColumns([]);

    const endpoint = view === 'labels' ? '/board' : '/board-by-status';
    axios.get(`${API_URL}${endpoint}`)
      .then(response => {
        // =======================================================
        // MUDANÇA: Verificamos se a resposta é um array antes de usá-la
        // =======================================================
        if (Array.isArray(response.data)) {
          setColumns(response.data);
          setFilteredColumns(response.data);
        } else {
          // Se não for um array, registramos o erro e mantemos as colunas vazias
          console.error("A resposta da API não continha uma lista de colunas:", response.data);
          setColumns([]);
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
    // ... (lógica do onDragEnd permanece a mesma)
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