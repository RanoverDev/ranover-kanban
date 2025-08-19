import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const API_URL = '/api';

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
      // Aqui faríamos a chamada à API para persistir a nova ordem
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

  // =======================================================
  // NOVA FUNÇÃO PARA ADICIONAR UM CARTÃO
  // =======================================================
  const handleAddCard = (columnId) => {
    const cardContent = prompt('Digite o conteúdo do novo cartão:');
    if (!cardContent) return; // Se o usuário cancelar

    const column = columns.find(col => col.id === columnId);
    const newCard = {
      content: cardContent,
      column_id: columnId,
      order: column.cards.length // Adiciona no final da coluna
    };

    axios.post(`${API_URL}/cards`, newCard)
      .then(response => {
        // Recarrega o quadro para mostrar o novo cartão
        fetchBoard();
      })
      .catch(err => {
        console.error("Erro ao adicionar o cartão!", err);
      });
  };


  return (
    <div className="flex p-4 space-x-4 h-screen bg-sky-600">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map(column => (
          <Droppable droppableId={column.id.toString()} key={column.id}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="bg-gray-100 p-3 rounded-lg w-80 flex-shrink-0 flex flex-col"
              >
                <h2 className="font-bold mb-3 px-1">{column.title}</h2>
                <div className="overflow-y-auto">
                  {column.cards.map((card, index) => (
                    <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-2 mb-2 rounded shadow hover:bg-gray-50"
                        >
                          {card.content}
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
                {provided.placeholder}
                {/* ======================================================= */}
                {/* NOVO BOTÃO PARA ADICIONAR CARTÃO                    */}
                {/* ======================================================= */}
                <button
                  onClick={() => handleAddCard(column.id)}
                  className="mt-4 p-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  + Adicionar cartão
                </button>
              </div>
            )}
          </Droppable>
        ))}
      </DragDropContext>
    </div>
  );
}

export default App;