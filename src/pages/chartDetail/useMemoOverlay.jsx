import { useCallback, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

export default function useMemoOverlay({ onDirty }) {
  const [memos, setMemos] = useState([]);
  const [isPlacingMemo, setIsPlacingMemo] = useState(false);
  const [activeMemoId, setActiveMemoId] = useState(null);
  const [draggingMemo, setDraggingMemo] = useState(null);
  const dragMoved = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMemoPlace = useCallback((event, section, ref) => {
    if (!isPlacingMemo || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const newMemo = { id: Date.now().toString(), x, y, text: '', section };

    setMemos(prev => [...prev, newMemo]);
    setIsPlacingMemo(false);
    setActiveMemoId(newMemo.id);
    onDirty();
  }, [isPlacingMemo, onDirty]);

  const renderMemoOverlay = useCallback((section, ref) => {
    if (!isPlacingMemo) return null;

    return (
      <div
        className="absolute inset-0 z-[80] cursor-crosshair bg-indigo-500/10 rounded-2xl outline-dashed outline-2 outline-indigo-400 transition-all animate-pulse"
        onPointerDown={event => handleMemoPlace(event, section, ref)}
      />
    );
  }, [handleMemoPlace, isPlacingMemo]);

  const renderMemos = useCallback((section, ref) => (
    memos
      .filter(memo => memo.section === section || (!memo.section && section === 'chart'))
      .map(memo => (
        <div
          key={memo.id}
          onPointerDown={(event) => {
            event.stopPropagation();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragMoved.current = false;
            dragStartPos.current = { x: event.clientX, y: event.clientY };
            setDraggingMemo({ id: memo.id, ref });
          }}
          onPointerMove={(event) => {
            if (draggingMemo?.id !== memo.id || !ref.current) return;

            const distance = Math.hypot(
              event.clientX - dragStartPos.current.x,
              event.clientY - dragStartPos.current.y,
            );
            if (distance > 5) dragMoved.current = true;

            const rect = ref.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

            setMemos(prev => prev.map(item => (
              item.id === memo.id ? { ...item, x, y } : item
            )));
          }}
          onPointerUp={(event) => {
            if (draggingMemo?.id !== memo.id) return;

            event.currentTarget.releasePointerCapture(event.pointerId);
            setDraggingMemo(null);
            if (dragMoved.current) {
              onDirty();
            } else if (!isPlacingMemo) {
              setActiveMemoId(memo.id);
            }
          }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 z-[60] touch-none transition-transform ${draggingMemo?.id === memo.id ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105 active:scale-95'}`}
          style={{ left: `${memo.x}%`, top: `${memo.y}%` }}
        >
          <div className="bg-yellow-200 w-8 h-8 sm:w-10 sm:h-10 rounded-md shadow-md border border-yellow-400 flex items-center justify-center text-yellow-900 pointer-events-none">
            <Icon name="memo" size={18} />
          </div>
          {memo.text && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white/90 px-2 py-0.5 rounded shadow-sm text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis pointer-events-none">
              {memo.text}
            </div>
          )}
        </div>
      ))
  ), [draggingMemo, isPlacingMemo, memos, onDirty]);

  const saveActiveMemoText = useCallback((text) => {
    if (!activeMemoId) return;

    const trimmedText = text.trim();
    setMemos(prev => (
      trimmedText
        ? prev.map(memo => memo.id === activeMemoId ? { ...memo, text } : memo)
        : prev.filter(memo => memo.id !== activeMemoId)
    ));
    setActiveMemoId(null);
    onDirty();
  }, [activeMemoId, onDirty]);

  const deleteActiveMemo = useCallback(() => {
    if (!activeMemoId) return;

    setMemos(prev => prev.filter(memo => memo.id !== activeMemoId));
    setActiveMemoId(null);
    onDirty();
  }, [activeMemoId, onDirty]);

  return {
    memos,
    setMemos,
    isPlacingMemo,
    setIsPlacingMemo,
    activeMemoId,
    renderMemoOverlay,
    renderMemos,
    isMemoActive: isPlacingMemo || draggingMemo !== null,
    saveActiveMemoText,
    deleteActiveMemo,
  };
}
