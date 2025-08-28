// VERSÃO FINAL E VERIFICADA
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-beautiful-dnd';
import Board from './components/Board';

const API_URL = '/api';

const DateFilterButton = ({ filterValue, label, activeFilter, setFilter }) => (
  <button
    onClick={() => setFilter(filterValue)}
    className={`px-3 py-1 text-xs rounded-full ${activeFilter === filterValue ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
  >
    {label}
  </button>
);

function App() {
  const [activeView, setActiveView] = useState('funnel');
  const [allColumns, setAllColumns] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [filteredColumns, setFilteredColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [appConfig, setAppConfig] = useState(null);

  // Efeito para sincronizar o tema com o Chatwoot
  useEffect(() => {
    const handleThemeChange = (event) => {
      if (event.source !== window.parent || !event.data.event) return;
      
      if (event.data.event === 'theme-changed') {
        const theme = event.data.theme || 'light';
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
      }
    };
    window.addEventListener('message', handleThemeChange);
    window.parent.postMessage({ event: 'app-loaded' }, '*');
    return () => { window.removeEventListener('message', handleThemeChange); };
  }, []);

  const fetchBoardData = (view) => {
    setLoading(true);
    let endpoint = '/board-funnel';
    if (view === 'labels') endpoint = '/board';
    if (view === 'status') endpoint = '/board-by-status';
    
    axios.get(`${API_URL}${endpoint}`)
      .then(response => {
        if (Array.isArray(response.data)) { setAllColumns(response.data); } 
        else { setAllColumns([]); }
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
          axios.get(`${API_URL}/board`)
        ]);
        setAppConfig(configRes.data);
        if (Array.isArray(labelsRes.data)) { setAllLabels(labelsRes.data); }
      } catch (err) {
        console.error("Erro ao carregar configuração ou etiquetas!", err);
      }
    };
    fetchInitialSetup();
  }, []);
  
  useEffect(() => {
    if (appConfig) {
      fetchBoardData(activeView);
    }
  }, [activeView, appConfig]);

  useEffect(() => {
    let newFilteredData = [...allColumns];
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (dateFilter === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'yesterday') {
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (dateFilter === '15days') {
        startDate.setDate(now.getDate() - 15);
      } else if (dateFilter === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (dateFilter === '60days') {
        startDate.setDate(now.getDate() - 60);
      }
      newFilteredData = newFilteredData.map(column => ({
        ...column,
        cards: column.cards.filter(card => {
          if (!card.last_activity_at) return false;
          const cardDate = new Date(card.last_activity_at * 1000);
          return cardDate >= startDate;
        })
      }));
    }

    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      newFilteredData = newFilteredData.map(column => ({
        ...column,
        cards: column.cards.filter(card => 
          card.content.toLowerCase().includes(lowercasedFilter)
        ),
      }));
    }
    setFilteredColumns(newFilteredData);
  }, [searchTerm, dateFilter, allColumns]);

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

    if (activeView === 'funnel') {
        axios.post(`${API_URL}/funnel/stage`, { conversationId: conversationId, stage: destination.droppableId })
            .catch(err => { console.error("Falha ao atualizar estágio do funil", err); fetchBoardData(activeView); });
    } else if (activeView === 'labels') {
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
      <header className="p-4 bg-white border-b border-slate-200 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex space-x-2">
                <button onClick={() => setActiveView('funnel')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'funnel' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}> Funil de Atendimento </button>
                <button onClick={() => setActiveView('status')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'status' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}> Status Chatwoot </button>
                <button onClick={() => setActiveView('labels')} className={`px-3 py-2 rounded-md font-semibold ${activeView === 'labels' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}> Quadro por Etiquetas </button>
            </div>
            <div className="w-1/3">
                <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 rounded-md border border-slate-300"/>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-600">Filtrar por data:</span>
            <DateFilterButton filterValue="all" label="Todos" activeFilter={dateFilter} setFilter={setDateFilter} />
            <DateFilterButton filterValue="today" label="Hoje" activeFilter={dateFilter} setFilter={setDateFilter} />
            <DateFilterButton filterValue="yesterday" label="De Ontem" activeFilter={dateFilter} setFilter={setDateFilter} />
            <DateFilterButton filterValue="7days" label="Últimos 7 dias" activeFilter={dateFilter} setFilter={setDateFilter} />
            <DateFilterButton filterValue="15days" label="Últimos 15 dias" activeFilter={dateFilter} setFilter={setDateFilter} />
            <DateFilterButton filterValue="30days" label="Últimos 30 dias" activeFilter={dateFilter} setFilter={setDateFilter} />
            <DateFilterButton filterValue="60days" label="Últimos 60 dias" activeFilter={dateFilter} setFilter={setDateFilter} />
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
        {loading || !appConfig ? (
          <div className="flex justify-center items-center h-full"><p>Carregando...</p></div>
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