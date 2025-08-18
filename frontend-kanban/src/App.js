import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const API_URL = '/api';

function App() {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/board`).then(response => {
      setColumns(response.data);
    });
  }, []);

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    // Se moveu para a mesma posição
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const sourceCol = columns.find(col => col.id.toString() === source.droppableId);
    const destCol = columns.find(col => col.id.toString() === destination.droppableId);
    const sourceCards = [...sourceCol.cards];
    const [removed] = sourceCards.splice(source.index, 1);

    // Movendo dentro da mesma coluna
    if (source.droppableId === destination.droppableId) {
      sourceCards.splice(destination.index, 0, removed);
      const newColumns = columns.map(col =>
        col.id.toString() === source.droppableId ? { ...col, cards: sourceCards } : col
      );
      setColumns(newColumns);
      // Aqui faríamos a chamada à API para persistir a nova ordem
    } else { // Movendo para outra coluna
      const destCards = [...destCol.cards];
      destCards.splice(destination.index, 0, removed);
      const newColumns = columns.map(col => {
        if (col.id.toString() === source.droppableId) return { ...col, cards: sourceCards };
        if (col.id.toString() === destination.droppableId) return { ...col, cards: destCards };
        return col;
      });
      setColumns(newColumns);
      
      // Salva a mudança no backend
      axios.put(`${API_URL}/cards/${removed.id}/move`, {
        newColumnId: destination.droppableId,
        newOrder: destination.index
      }).catch(err => console.error("Failed to move card", err));
    }
  };

  return (
    <div className="flex p-4 space-x-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map(column => (
          <Droppable droppableId={column.id.toString()} key={column.id}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="bg-gray-200 p-3 rounded-lg w-72 flex-shrink-0"
              >
                <h2 className="font-bold mb-3">{column.title}</h2>
                {column.cards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white p-2 mb-2 rounded shadow"
                      >
                        {card.content}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </DragDropContext>
    </div>
  );
}

export default App;