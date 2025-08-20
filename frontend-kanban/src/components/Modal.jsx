// frontend-kanban/src/components/Modal.jsx

import React from 'react';

function Modal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    // Fundo semi-transparente
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      {/* Container do Modal */}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        
        {/* Conteúdo dinâmico (pode ser um texto de confirmação ou um input) */}
        <div className="mb-6">
          {children}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-200 hover:bg-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;