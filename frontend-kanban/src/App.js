// frontend-kanban/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const API_URL = '/api';
const CHATWOOT_BASE_URL = process.env.REACT_APP_CHATWOOT_BASE_URL;
const CHATWOOT_ACCOUNT_ID = process.env.REACT_APP_CHATWOOT_ACCOUNT_ID;

const columnColors = [
  { bg: 'bg-sky-200', text: 'text-sky-800' },
  { bg: 'bg-amber-200', text: 'text-amber-800' },
  { bg: 'bg-emerald-200', text: 'text-emerald-800' },
  { bg: 'bg-indigo-200', text: 'text-indigo-800' },
  { bg: 'bg-rose-200', text: 'text-rose-800' },
];

function App() {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = () => {
    setLoading(true);
    axios.get(`${API_URL}/board`)
      .then(response => {
        setColumns(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar os dados do quadro!", err);
        setLoading(false);
      });
  }

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const conversationId = draggableId;
    const sourceLabel = source.droppableId;
    const destinationLabel = destination.droppableId;

    const allColumns = [...columns];
    const sourceCol = allColumns.find(col => col.id === sourceLabel);
    const movedCard = sourceCol.cards.find(card => card.id.toString() === conversationId);

    if (!movedCard) return;

    const newLabels = (movedCard.labels || []).filter(label => label !== sourceLabel);
    if (!newLabels.includes(destinationLabel)) {
      newLabels.push(destinationLabel);
    }

    const sourceColumn = allColumns.find(col => col.id === sourceLabel);
    const [cardToMove] = sourceColumn.cards.splice(source.index, 1);
    const destColumn = allColumns.find(col => col.id === destinationLabel);
    destColumn.cards.splice(destination.index, 0, cardToMove);
    setColumns(allColumns);

    axios.post(`${API_URL}/conversations/${conversationId}/labels`, { labels: newLabels })
      .catch(err => {
        console.error("Falha ao atualizar etiquetas no Chatwoot", err);
        fetchBoard();
      });
  };
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen bg-slate-100"><p>Carregando quadro do Chatwoot...</p></div>;
  }

  return (
    <div className="flex p-4 space-x-4 h-screen bg-slate-100 font-sans text-sm overflow-x-auto">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map((column, index) => {
          const color = columnColors[index % columnColors.length];
          return (
            <Droppable droppableId={column.id.toString()} key={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="bg-slate-200/70 p-2 rounded-lg w-80 flex-shrink-0 flex flex-col h-full"
                >
                  <div className={`p-2 rounded-md ${color.bg}`}>
                    <h2 className={`font-semibold text-base ${color.text}`}>{column.title}</h2>
                  </div>
                  <div className="overflow-y-auto flex-grow mt-2 pr-1">
                    {column.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                        {(provided) => (
                          <a 
                            href={`${CHATWOOT_BASE_URL}/app/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${card.id}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-3 mb-2 rounded-md shadow-sm hover:bg-slate-50 border border-slate-300/80 block"
                            title="Clique para abrir a conversa no Chatwoot"
                          >
                            {card.content}
                          </a>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          )
        })}
      </DragDropContext>
    </div>
  );
}

export default App;