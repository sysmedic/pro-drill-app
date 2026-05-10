export default function UtilitySheet({ utilityState, setUtilityState, pullStartYRef, onStartMemo, onShowHistory, isLocked }) {
  return (
    <>
      {utilityState === 'expanded' && <div className="fixed inset-0 z-[90] bg-transparent" onClick={() => setUtilityState('collapsed')} />}

      <div
        className={`fixed bottom-0 left-0 w-full flex justify-center z-[100] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${utilityState === 'hidden' ? 'translate-y-full opacity-0 pointer-events-none' : (utilityState === 'collapsed' ? 'translate-y-[calc(100%-28px)] opacity-100' : 'translate-y-0 opacity-100')} ${isLocked ? 'pointer-events-none opacity-50 grayscale' : 'pointer-events-auto'}`}
      >
        <div className="bg-white/95 backdrop-blur-md shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl border border-slate-200 flex flex-col w-full max-w-[768px] pb-8 pt-1 relative">
          <div
            className="w-full pt-2 pb-4 flex justify-center items-center cursor-pointer touch-none"
            onClick={() => setUtilityState(utilityState === 'expanded' ? 'collapsed' : 'expanded')}
            onTouchStart={(e) => pullStartYRef.current = e.touches[0].clientY}
            onTouchMove={(e) => {
              if (!pullStartYRef.current) return;
              const diff = e.touches[0].clientY - pullStartYRef.current;
              if (diff > 30) {
                setUtilityState('collapsed');
                pullStartYRef.current = null;
              } else if (diff < -30) {
                setUtilityState('expanded');
                pullStartYRef.current = null;
              }
            }}
            onTouchEnd={() => pullStartYRef.current = null}
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          <div className={`px-4 transition-opacity duration-300 ${utilityState === 'expanded' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex justify-between items-center px-2 mb-2">
              <span className="text-xs font-black text-slate-500 tracking-wider">유틸리티 도구</span>
              <button type="button" aria-label="유틸리티 닫기" onClick={() => setUtilityState('hidden')} className="text-slate-400 hover:text-red-500 transition-colors font-bold text-lg leading-none p-1">✕</button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button type="button" onClick={onStartMemo} className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-700 text-sm font-bold whitespace-nowrap active:scale-95 shadow-sm"><span className="text-base">📝</span>메모하기</button>
              <button type="button" onClick={onShowHistory} className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-700 text-sm font-bold whitespace-nowrap active:scale-95 shadow-sm"><span className="text-base">📜</span>저장기록</button>
              <button type="button" disabled aria-disabled="true" className="flex shrink-0 items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm font-bold whitespace-nowrap cursor-not-allowed disabled:opacity-70"><span className="text-base grayscale opacity-50">📷</span>사진첨부</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
