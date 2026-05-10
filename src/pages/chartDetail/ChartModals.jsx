import { useEffect, useRef, useState } from 'react';

export const MemoModal = ({ memo, onSave, onDelete }) => {
  const [text, setText] = useState(memo?.text || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveAndClose = (e) => {
    e?.stopPropagation();
    onSave(text);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleSaveAndClose(event);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/40" onClick={handleSaveAndClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memo-modal-title"
        className="bg-yellow-50 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-yellow-200 px-4 py-3 flex justify-between items-center border-b border-yellow-300">
          <span id="memo-modal-title" className="font-black text-yellow-800">📝 메모 작성</span>
          <button type="button" aria-label="메모 닫기" onClick={handleSaveAndClose} className="text-yellow-700 hover:text-yellow-900 font-bold p-1">✕</button>
        </div>
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="내용을 입력하세요..."
            className="w-full h-32 bg-transparent border-0 outline-none resize-none text-slate-800 text-base font-semibold"
          />
        </div>
        <div className="bg-yellow-100/50 px-4 py-3 flex justify-between items-center border-t border-yellow-200">
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500 font-bold px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors">삭제</button>
          <button type="button" onClick={handleSaveAndClose} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black px-5 py-2 rounded-lg shadow-sm active:scale-95 transition-all">저장</button>
        </div>
      </div>
    </div>
  );
};

export const HistoryModal = ({ history, onSelect, onClose, onDelete, onRename }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-800 px-5 py-4 flex justify-between items-center">
          <span id="history-modal-title" className="font-black text-white text-lg">📜 저장 기록</span>
          <button type="button" aria-label="저장 기록 닫기" onClick={onClose} className="text-slate-400 hover:text-white font-black p-1 text-xl transition-colors">✕</button>
        </div>
        <div className="p-3 max-h-[60vh] overflow-y-auto bg-slate-50">
          {history.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-2">
              <span className="text-4xl">📂</span>
              <span className="text-slate-400 font-bold">저장된 기록이 없습니다.</span>
            </div>
          ) : (
            history.map((record, index) => (
              <div key={record.id} className="w-full flex items-center justify-between p-4 mb-2 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-indigo-400 group">
                <div className="flex flex-col items-start flex-1 cursor-pointer" onClick={() => { onSelect(record); onClose(); }}>
                  <span className="text-sm font-black text-indigo-600 mb-1 group-hover:text-indigo-700">
                    {record.name || (index === 0 ? "최근 버전" : `Version ${history.length - index}`)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">{record.timestamp}</span>
                </div>

                <div className="flex gap-1 ml-2 shrink-0">
                  <button type="button" aria-label="기록 이름 변경" onClick={(e) => { e.stopPropagation(); onRename(record.id, record.name || `Version ${history.length - index}`); }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-500 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors">✏️</button>
                  <button type="button" aria-label="기록 삭제" onClick={(e) => { e.stopPropagation(); onDelete(record.id); }} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors">✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const ExitConfirmModal = ({ onClose, onSaveAndExit, onExitWithoutSave }) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-confirm-title"
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-slate-800 px-5 py-4 flex justify-between items-center">
          <span id="exit-confirm-title" className="font-black text-white text-lg">⚠️ 주의</span>
          <button type="button" aria-label="나가기 확인 닫기" onClick={onClose} className="text-slate-400 hover:text-white font-black p-1 text-xl transition-colors">✕</button>
        </div>
        <div className="p-5 flex flex-col gap-4 bg-slate-50">
          <p className="text-sm font-bold text-slate-700 text-center">
            저장되지 않은 변경 사항이 있습니다.<br />어떻게 하시겠습니까?
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <button type="button" onClick={onSaveAndExit} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-sm active:scale-95 transition-all">저장하고 나가기</button>
            <button type="button" onClick={onExitWithoutSave} className="w-full bg-red-100 hover:bg-red-200 text-red-600 font-black py-3 rounded-xl shadow-sm active:scale-95 transition-all">저장하지 않고 나가기</button>
            <button type="button" onClick={onClose} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-black py-3 rounded-xl shadow-sm active:scale-95 transition-all">취소</button>
          </div>
        </div>
      </div>
    </div>
  );
};
