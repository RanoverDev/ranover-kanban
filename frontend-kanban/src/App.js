import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const API_URL = '/api';

// Paleta de cores para as colunas
const columnColors = [
  { bg: 'bg-sky-200', text: 'text-sky-800' },
  { bg: 'bg-amber-200', text: 'text-amber-800' },
  { bg: 'bg-emerald-200', text: 'text-emerald-800' },
  { bg: 'bg-indigo-200', text: 'text-indigo-800' },
  { bg: 'bg-rose-200', text: 'text-rose-800' },
];

function App() {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = () => {
    axios.get(`${API_URL}/board`).then(response => {
      setColumns(response.data);
    }).catch(err => {
      console.error("Erro ao buscar os dados do quadro!", err);
    });
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const sourceCol = columns.find(col => col.id.toString() === source.droppableId);
    const destCol = columns.find(col => col.id.toString() === destination.droppableId);
    const sourceCards = [...sourceCol.cards];
    const [removed] = sourceCards.splice(source.index, 1);

    if (source.droppableId === destination.droppableId) {
      sourceCards.splice(destination.index, 0, removed);
      const newColumns = columns.map(col =>
        col.id.toString() === source.droppableId ? { ...col, cards: sourceCards } : col
      );
      setColumns(newColumns);
    } else {
      const destCards = [...destCol.cards];
      destCards.splice(destination.index, 0, removed);
      const newColumns = columns.map(col => {
        if (col.id.toString() === source.droppableId) return { ...col, cards: sourceCards };
        if (col.id.toString() === destination.droppableId) return { ...col, cards: destCards };
        return col;
      });
      setColumns(newColumns);
      
      axios.put(`${API_URL}/cards/${removed.id}/move`, {
        newColumnId: destination.droppableId,
        newOrder: destination.index
      }).catch(err => console.error("Falha ao mover o cartão", err));
    }
  };

  const handleAddCard = (columnId) => {
    const cardContent = prompt('Digite o conteúdo do novo cartão:');
    if (!cardContent) return;

    const column = columns.find(col => col.id === columnId);
    const newCard = {
      content: cardContent,
      column_id: columnId,
      order: column.cards.length
    };

    axios.post(`${API_URL}/cards`, newCard)
      .then(() => {
        fetchBoard(); 
      })
      .catch(err => {
        console.error("Erro ao adicionar o cartão!", err);
      });
  };
  
  const handleDeleteCard = (cardId) => {
    if (window.confirm('Tem certeza que deseja excluir este cartão?')) {
      axios.delete(`${API_URL}/cards/${cardId}`)
        .then(() => {
          fetchBoard();
        })
        .catch(err => {
          console.error("Erro ao deletar o cartão!", err);
          alert("Não foi possível excluir o cartão.");
        });
    }
  };

  const handleEditCard = (card) => {
    const newContent = prompt('Edite o conteúdo do cartão:', card.content);
    if (newContent && newContent !== card.content) {
      axios.put(`${API_URL}/cards/${card.id}`, { content: newContent })
        .then(() => {
          fetchBoard();
        })
        .catch(err => {
          console.error("Erro ao editar o cartão!", err);
          alert("Não foi possível editar o cartão.");
        });
    }
  };

  return (
    <div className="flex p-4 space-x-4 h-screen bg-slate-100 font-sans text-sm">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map((column, index) => {
          const color = columnColors[index % columnColors.length];
          return (
            <Droppable droppableId={column.id.toString()} key={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="bg-slate-200/70 p-2 rounded-lg w-80 flex-shrink-0 flex flex-col"
                >
                  <div className={`p-2 rounded-md ${color.bg}`}>
                    <h2 className={`font-semibold text-base ${color.text}`}>{column.title}</h2>
                  </div>
                  <div className="overflow-y-auto flex-grow mt-2">
                    {column.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white p-3 mb-2 rounded-md shadow-sm hover:bg-slate-50 border border-slate-300/80 relative group"
                          >
                            {card.content}
                            
                            <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleEditCard(card)}
                                className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 hover:bg-yellow-500 hover:text-white flex items-center justify-center text-xs"
                                aria-label="Editar cartão"
                              >
                                ✏️
                              </button>
                              <button 
                                onClick={() => handleDeleteCard(card.id)}
                                className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 hover:bg-red-500 hover:text-white flex items-center justify-center"
                                aria-label="Excluir cartão"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                  <button
                    onClick={() => handleAddCard(column.id)}
                    className="mt-2 p-2 text-sm text-slate-500 hover:text-blue-600 hover:bg-blue-100/50 rounded-md flex items-center justify-start w-full"
                  >
                    <span className="text-lg mr-2">+</span> Adicionar um cartão
                  </button>
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