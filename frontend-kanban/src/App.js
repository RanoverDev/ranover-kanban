import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const API_URL = '/api';
const CHATWOOT_BASE_URL = process.env.REACT_APP_CHATWOOT_BASE_URL;
const CHATWOOT_ACCOUNT_ID = process.env.REACT_APP_CHATWOOT_ACCOUNT_ID;

const getTextColorForBg = (hexColor) => {
  if (!hexColor) return 'text-black';
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'text-gray-800' : 'text-white';
};

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

    const conversationId = draggableId.split('-')[0];
    const sourceLabel = source.droppableId;
    const destinationLabel = destination.droppableId;

    const allColumns = [...columns];
    const sourceCol = allColumns.find(col => col.id === sourceLabel);
    const movedCard = sourceCol.cards.find(card => `${card.id}-${sourceCol.id}` === draggableId);

    if (!movedCard) return;

    const newLabels = (movedCard.labels || []).filter(label => label !== sourceLabel);
    if (!newLabels.includes(destinationLabel)) {
      newLabels.push(destinationLabel);
    }
    
    const sourceColumn = allColumns.find(col => col.id === sourceLabel);
    const cardIndex = sourceColumn.cards.findIndex(card => `${card.id}-${sourceColumn.id}` === draggableId);
    const [cardToMove] = sourceColumn.cards.splice(cardIndex, 1);
    
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
        {columns.map((column) => {
          const textColorClass = getTextColorForBg(column.color);
          return (
            <Droppable droppableId={column.id.toString()} key={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="bg-slate-200/70 p-2 rounded-lg w-80 flex-shrink-0 flex flex-col h-full"
                >
                  <div 
                    className="p-2 rounded-md"
                    style={{ backgroundColor: column.color || '#cccccc' }}
                  >
                    <h2 className={`font-semibold text-base ${textColorClass}`}>{column.title}</h2>
                  </div>
                  <div className="overflow-y-auto flex-grow mt-2 pr-1">
                    {column.cards.map((card, index) => (
                      <Draggable key={`${card.id}-${column.id}`} draggableId={`${card.id}-${column.id}`} index={index}>
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
                            <div className="flex items-center mb-2">
                              {card.avatar_url && (
                                <img 
                                  src={card.avatar_url} 
                                  alt={`Avatar`} 
                                  className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                                />
                              )}
                              <span className="flex-grow font-semibold text-slate-800">{card.content}</span>
                            </div>
                            {card.last_message && (
                              <p className="text-xs text-slate-600 truncate italic">
                                "{card.last_message}"
                              </p>
                            )}
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