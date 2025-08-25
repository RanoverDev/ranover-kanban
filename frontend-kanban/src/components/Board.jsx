import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';

const getTextColorForBg = (hexColor) => {
  if (!hexColor) return 'text-gray-800'; // Retorna texto escuro por padrão
  try {
    // Remove o '#' se ele existir
    const cleanHex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    // Fórmula de luminância padrão
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Retorna texto quase preto para fundos claros, e branco para fundos escuros
    return luminance > 0.5 ? 'text-gray-800' : 'text-white';
  } catch (e) { 
    return 'text-gray-800';
  }
};

function Board({ columns, activeView, config, allLabels }) {
  const defaultColors = [ '#3B82F6', '#F59E0B', '#10B981', '#6366F1', '#EC4899'];

  return (
    <div className="flex p-4 space-x-4 h-full overflow-x-auto">
      {columns.map((column, index) => {
        const columnColor = column.color || defaultColors[index % defaultColors.length];
        const textColorClass = getTextColorForBg(columnColor);
        
        return (
          <Droppable droppableId={column.id.toString()} key={column.id}>
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="bg-slate-200/70 p-2 rounded-lg w-80 flex-shrink-0 flex flex-col h-full">
                <div className="p-2 rounded-md" style={{ backgroundColor: columnColor }}>
                  <h2 className={`font-semibold text-base ${textColorClass}`}>{column.title}</h2>
                </div>
                <div className="overflow-y-auto flex-grow mt-2 pr-1">
                  {column.cards.map((card, index) => (
                    <Draggable key={`${card.id}-${column.id}`} draggableId={`${card.id}-${column.id}`} index={index}>
                      {(provided) => (
                        <a 
                          href={config ? `${config.chatwootBaseUrl}/app/accounts/${config.chatwootAccountId}/conversations/${card.id}` : '#'}
                          target="_blank" rel="noopener noreferrer"
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white p-3 mb-2 rounded-md shadow-sm hover:bg-slate-50 border border-slate-300/80 block"
                          title="Clique para abrir a conversa no Chatwoot"
                        >
                          <div className="flex items-center">
                            {card.avatar_url && (<img src={card.avatar_url} alt={`Avatar`} className="w-8 h-8 rounded-full mr-3 flex-shrink-0"/>)}
                            <span className="flex-grow font-semibold text-slate-800">{card.content}</span>
                          </div>
                          {(activeView === 'status' || activeView === 'funnel') && card.labels && card.labels.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {card.labels.map(labelTitle => {
                                const labelData = allLabels.find(l => l.id === labelTitle);
                                const labelColor = labelData ? labelData.color : '#6B7280';
                                // =======================================================
                                // AQUI ESTÁ A CORREÇÃO: Calculamos a cor do texto da etiqueta
                                // =======================================================
                                const labelTextColorClass = getTextColorForBg(labelColor);
                                
                                return (
                                  <span key={labelTitle} className={`text-xs font-semibold px-2 py-1 rounded-full ${labelTextColorClass}`} style={{ backgroundColor: labelColor }}>
                                    {labelTitle}
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