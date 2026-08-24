import React from 'react';
import ModalShell from './ui/ModalShell.jsx';

export default function OptionPickerModal({
  isOpen,
  onClose,
  onSelect,
  options = [],
  title = '옵션 선택',
  value = '',
}) {
  if (!isOpen) return null;

  return (
    <ModalShell onClose={onClose} title={title} size="md">
      {/* 📱 터치 스크롤 패닝(touch-pan-y) & overscroll-contain 최적화로 모바일에서 매끄러운 스크롤 보장 */}
      <div className="p-3.5 sm:p-4 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y space-y-2 [webkit-overflow-scrolling:touch]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isSelected = value === optVal;

            return (
              <button
                key={optVal}
                type="button"
                onClick={() => {
                  onSelect(optVal);
                  onClose();
                }}
                className={`py-3.5 px-2 rounded-xl text-sm font-bold transition-all cursor-pointer border text-center active:scale-[0.97] ${
                  isSelected
                    ? 'bg-slate-800 text-white border-slate-800 font-black shadow-xs ring-2 ring-slate-400'
                    : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                {optLabel}
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
