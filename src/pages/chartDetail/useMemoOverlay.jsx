import { useCallback, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { createLocalId } from '../../lib/ids.js';

const COLOR_CLASSES = {
  yellow: 'bg-yellow-200 border-yellow-400 text-yellow-900',
  red: 'bg-red-200 border-red-400 text-red-900',
  blue: 'bg-blue-200 border-blue-400 text-blue-900',
  green: 'bg-emerald-200 border-emerald-400 text-emerald-900',
  purple: 'bg-purple-200 border-purple-400 text-purple-900',
};

export default function useMemoOverlay({ onDirty }) {
  const [memos, setMemos] = useState([]);
  const [isPlacingMemo, setIsPlacingMemo] = useState(false);
  const [activeMemoId, setActiveMemoId] = useState(null);
  
  const activeMemo = memos.find(m => m.id === activeMemoId);

  const [draggingMemoId, setDraggingMemoId] = useState(null); 
  
  const dragId = useRef(null); 
  const dragMoved = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0, memoX: 0, memoY: 0 });
  const dragTargetType = useRef(null);

  const handleMemoPlace = useCallback((event, section, ref) => {
    if (!isPlacingMemo || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const newMemo = { id: createLocalId('memo'), x, y, text: '', section, color: 'yellow', shape: 'memo', isPinned: false };

    setMemos(prev => [...prev, newMemo]);
    setIsPlacingMemo(false);
    setActiveMemoId(newMemo.id);
    onDirty();
  }, [isPlacingMemo, onDirty]);

  const renderMemoOverlay = useCallback((section, ref) => {
    if (!isPlacingMemo) return null;

    return (
      <div
          className="absolute inset-0 z-[80] touch-none cursor-crosshair bg-indigo-500/10 rounded-2xl outline-dashed outline-2 outline-indigo-400 transition-all animate-pulse"
          onClick={event => handleMemoPlace(event, section, ref)}
      />
    );
  }, [handleMemoPlace, isPlacingMemo]);

  const renderMemos = useCallback((section, ref) => (
    memos
      .filter(memo => memo.section === section || (!memo.section && section === 'chart'))
      .map(memo => {
        const isPinned = memo.isPinned;
        const isDragging = draggingMemoId === memo.id; // 🟢 드레그 진행 여부 판별 변수
        
        const translateClass = isPinned ? '' : '-translate-x-1/2 -translate-y-1/2';
        
        // 🎯 [수정 완료] 드레그 활성화 중에는 transition 애니메이션을 꺼야 고무줄 지연 없이 부드럽게 마우스를 밀착 추적합니다.
        const transitionClass = isDragging ? 'transition-none' : 'transition-transform duration-200';
        const scaleClass = isPinned ? '' : (isDragging && dragMoved.current ? 'scale-110' : 'hover:scale-105');
        const cursorClass = isDragging && dragMoved.current ? 'cursor-grabbing' : 'cursor-grab';

        return (
          <div
            key={`${memo.id}-${isPinned ? 'pinned' : 'unpinned'}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              
              const isHandle = !!event.target.closest('[data-drag-handle="true"]');
              const isText = !!event.target.closest('[data-text-area="true"]');

              if (isPinned && !isHandle && !isText) {
                return;
              }

              try { event.currentTarget.setPointerCapture(event.pointerId); } catch(e) {}
              
              dragId.current = memo.id; 
              dragMoved.current = false;
              dragStartPos.current = { x: event.clientX, y: event.clientY, memoX: memo.x, memoY: memo.y };
              dragTargetType.current = isHandle ? 'handle' : (isText ? 'text' : null);
              setDraggingMemoId(memo.id);
            }}
            onPointerMove={(event) => {
              if (dragId.current !== memo.id || !ref.current) return;

              const distance = Math.hypot(
                event.clientX - dragStartPos.current.x,
                event.clientY - dragStartPos.current.y,
              );
              
              if (distance > 10) {
                if (isPinned && dragTargetType.current !== 'handle') return;

                dragMoved.current = true;
                const rect = ref.current.getBoundingClientRect();
                
                const deltaX = ((event.clientX - dragStartPos.current.x) / rect.width) * 100;
                const deltaY = ((event.clientY - dragStartPos.current.y) / rect.height) * 100;

                const newX = Math.max(0, Math.min(100, dragStartPos.current.memoX + deltaX));
                const newY = Math.max(0, Math.min(100, dragStartPos.current.memoY + deltaY));

                setMemos(prev => prev.map(item => (
                  item.id === memo.id ? { ...item, x: newX, y: newY } : item
                )));
              }
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              if (dragId.current !== memo.id) return;

              try { event.currentTarget.releasePointerCapture(event.pointerId); } catch(e) {}
              
              if (dragMoved.current) {
                onDirty();
              } else if (!isPlacingMemo) {
                if (isPinned) {
                  if (dragTargetType.current === 'text') {
                    setActiveMemoId(memo.id);
                  }
                } else {
                  setActiveMemoId(memo.id);
                }
              }

              dragId.current = null;
              setDraggingMemoId(null);
              dragTargetType.current = null; 
            }}
            onPointerCancel={(event) => {
              if (dragId.current !== memo.id) return;
              try { event.currentTarget.releasePointerCapture(event.pointerId); } catch(e) {}
              dragId.current = null;
              setDraggingMemoId(null);
              dragMoved.current = false;
              dragTargetType.current = null;
            }}
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-[60] ${transitionClass} ${translateClass} ${scaleClass} ${isPinned ? '' : cursorClass}`}
            // 🎯 [수정 완료] 모바일 스크롤 간섭 및 좌표 이탈 꼬임 현상 완벽 방지를 위해 touchAction을 'none'으로 안전화 제어
            style={{ left: `${memo.x}%`, top: `${memo.y}%`, touchAction: 'none' }}
          >
            
            {isPinned ? (
              <div className={`${COLOR_CLASSES[memo.color || 'yellow']} rounded-lg shadow-md border flex flex-col pointer-events-auto min-w-[120px] min-h-[64px] resize overflow-hidden opacity-90`}>
                
                <div 
                  data-drag-handle="true" 
                  className="flex justify-between items-center bg-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border-b border-black/20 px-2 py-1 shrink-0 cursor-grab active:cursor-grabbing"
                >
                  <Icon name={memo.shape || 'memo'} size={12} className="opacity-70 pointer-events-none" />
                  <button 
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()} 
                    onClick={(e) => { 
                      e.stopPropagation();
                      setMemos(prev => prev.map(m => m.id === memo.id ? { ...m, isPinned: false } : m));
                      onDirty();
                    }}
                    className="text-black/50 hover:text-black/90 font-black px-1.5 rounded-sm hover:bg-black/15 transition-colors pointer-events-auto text-[10px]"
                  >
                    ✕
                  </button>
                </div>

                <div 
                  data-text-area="true" 
                  className="p-2 text-xs font-bold text-slate-800 whitespace-pre-wrap break-words leading-snug flex-1 min-h-0 overflow-hidden pointer-events-auto cursor-pointer"
                >
                  {memo.text}
                </div>

              </div>
            ) : (
              <>
                <div className={`${COLOR_CLASSES[memo.color || 'yellow']} w-8 h-8 sm:w-10 sm:h-10 rounded-md shadow-md border flex items-center justify-center pointer-events-none opacity-90`}>
                  <Icon name={memo.shape || 'memo'} size={18} />
                </div>
                {memo.text && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white/90 px-2 py-0.5 rounded shadow-sm text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap max-w-[100px] overflow-hidden text-ellipsis pointer-events-none">
                    {memo.text}
                  </div>
                )}
              </>
            )}

          </div>
        );
      })
  ), [draggingMemoId, isPlacingMemo, memos, onDirty]);

  const saveActiveMemoText = useCallback((text, color = 'yellow', shape = 'memo', isPinned = false) => {
    if (!activeMemoId) return;

    const trimmedText = text.trim();
    setMemos(prev => (
      trimmedText
        ? prev.map(memo => memo.id === activeMemoId ? { ...memo, text, color, shape, isPinned } : memo)
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
    activeMemo,
    renderMemoOverlay,
    renderMemos,
    isMemoActive: isPlacingMemo || draggingMemoId !== null,
    saveActiveMemoText,
    deleteActiveMemo,
  };
}