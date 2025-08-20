import React, { useState, useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, onConfirm, title, children, showInput = false, initialInputValue = '' }) {
  const [inputValue, setInputValue] = useState(initialInputValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialInputValue); // Reseta o valor quando o modal abre
      // Foca no input de forma mais robusta
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100); // Pequeno delay para garantir que o elemento está visível
    }
  }, [isOpen, initialInputValue]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm(inputValue);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        
        <div className="mb-6">
          {children}
          {showInput && (
            <input 
              ref={inputRef}
              type="text" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              onKeyDown={handleKeyDown}
              className="w-full p-2 border rounded-md mt-2" 
            />
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-200 hover:bg-slate-300">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;