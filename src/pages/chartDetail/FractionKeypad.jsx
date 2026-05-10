import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function FractionKeypad({ isOpen, onClose, onConfirm, initialValue = '', title = '수치 입력', extraKeys = [] }) {
  const [value, setValue] = useState('');

  // 키패드가 열릴 때 초기값을 세팅합니다
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
    }
  }, [isOpen, initialValue]);

  // Up/Down 등 추가 키를 입력할 때 기존 추가 키를 지우고 교체하는 함수
  const handleExtraKeyPress = useCallback((keyToAdd) => {
    setValue((prev) => {
      let nextVal = prev;
      extraKeys.forEach((ek) => {
        nextVal = nextVal.replace(new RegExp(ek, 'g'), '');
      });
      nextVal = nextVal.trim();
      return nextVal ? `${nextVal} ${keyToAdd}` : keyToAdd;
    });
  }, [extraKeys]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        onConfirm(value.trim());
        onClose();
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        setValue((prev) => prev.slice(0, -1));
        e.preventDefault();
      } else if (/^[0-9\-/ ]$/.test(e.key)) {
        setValue((prev) => prev + e.key);
        e.preventDefault();
      } else if (e.key === 'ArrowUp' && extraKeys.includes('Up')) {
        handleExtraKeyPress('Up');
        e.preventDefault();
      } else if (e.key === 'ArrowDown' && extraKeys.includes('Down')) {
        handleExtraKeyPress('Down');
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, onClose, onConfirm, extraKeys, handleExtraKeyPress]);

  if (!isOpen) return null;

  const handleKeyPress = (key) => {
    setValue((prev) => prev + key);
  };

  const handleDelete = () => {
    setValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setValue('');
  };

  const handleSubmit = () => {
    onConfirm(value.trim());
    onClose();
  };

  // 큼지막한 숫자 키패드 배열
  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '-', '0', '/',
    '␣', '⌫' // ␣는 공백(Space)을 의미
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div 
        className="w-full max-w-[540px] bg-white rounded-t-2xl sm:rounded-2xl p-4 shadow-xl animate-[slideUp_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <div className="text-2xl font-bold text-indigo-600 tracking-wider bg-slate-100 px-4 py-2 rounded-lg min-w-[140px] text-right overflow-x-auto border border-slate-200">
            {value || <span className="text-slate-400 font-normal text-base">입력하세요</span>}
          </div>
        </div>

        {extraKeys && extraKeys.length > 0 && (
          <div className="flex gap-2 mb-2">
            {extraKeys.map((key, index) => {
              const label = key === 'Up' ? 'Up (↑)' : key === 'Down' ? 'Down (↓)' : key;
              return (
                <button
                  key={`extra-${index}`}
                  type="button"
                  onClick={() => handleExtraKeyPress(key)}
                  className="flex-1 h-12 sm:h-14 rounded-xl text-base sm:text-lg font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors active:scale-95 flex items-center justify-center"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-2">
          {keys.map((key, index) => (
            <button
              key={index}
              type="button"
              onClick={() => key === '⌫' ? handleDelete() : handleKeyPress(key === '␣' ? ' ' : key)}
              className={`h-14 sm:h-16 rounded-xl text-xl sm:text-2xl font-bold transition-colors active:scale-95 flex items-center justify-center ${
                key === '⌫' 
                  ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
                  : key === '␣'
                  ? 'col-span-2 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {key === '␣' ? <span className="text-base sm:text-lg">띄어쓰기</span> : key}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button 
            type="button" 
            onClick={handleClear}
            className="h-12 sm:h-14 rounded-xl text-lg font-bold bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors active:scale-95"
          >
            초기화
          </button>
          <button 
            type="button" 
            onClick={handleSubmit}
            className="h-12 sm:h-14 rounded-xl text-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}