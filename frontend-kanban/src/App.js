import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';

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

// O componente agora recebe a "activeView" para saber qual quadro está sendo exibido
function Board({ columns, activeView }) { 
  const defaultColors = [ '#3B82F6', '#F59E0B', '#10B981', '#6366F1', '#EC4899'];

  return (
    <div className="flex p-4 space-x-4 h-full overflow-x-auto">
      {columns.map((column, index) => {
        const columnColor = column.color || defaultColors[index % defaultColors.length];
        const textColorClass = getTextColorForBg(columnColor);
        
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
                  style={{ backgroundColor: columnColor }}
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
                          <div className="flex items-center">
                            {card.avatar_url && (
                              <img 
                                src={card.avatar_url} 
                                alt={`Avatar`} 
                                className="w-8 h-8 rounded-full mr-3 flex-shrink-0"
                              />
                            )}
                            <span className="flex-grow font-semibold text-slate-800">{card.content}</span>
                          </div>

                          {/* ======================================================= */}
                          {/* NOVA LÓGICA: Exibe as etiquetas apenas no quadro de Status */}
                          {/* ======================================================= */}
                          {activeView === 'status' && card.labels && card.labels.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {card.labels.map(label => {
                                // Encontra a cor da etiqueta na lista de colunas (que são as próprias etiquetas)
                                const labelData = columns.find(c => c.id === label);
                                const labelColor = labelData ? labelData.color : '#6B7280'; // Cor padrão cinza
                                
                                return (
                                  <span key={label} className="text-xs px-2 py-1 rounded-full text-white" style={{ backgroundColor: labelColor }}>
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
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
    </div>
  );
}

export default Board;