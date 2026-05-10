export default function TaskDetailsCard({
  ballName,
  innerRef,
  intent,
  isOpen,
  layoutInfo,
  memoOverlay,
  memosRenderer,
  onBallNameChange,
  onIntentChange,
  onLayoutInfoChange,
  onToggleOpen,
}) {
  return (
    <div ref={innerRef} className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200 mt-4 max-w-[768px] mx-auto relative z-40">
      {memoOverlay}
      {memosRenderer}

      <div className="flex items-center justify-between cursor-pointer select-none relative z-10" onClick={onToggleOpen}>
        <h3 className="font-black text-slate-800 text-sm sm:text-base pl-1 flex items-center gap-1.5">
          <span className="flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-slate-700">
              <circle cx="12" cy="12" r="10" /><circle cx="9" cy="9" r="1.5" fill="white" /><circle cx="15" cy="9" r="1.5" fill="white" /><circle cx="12" cy="14" r="1.8" fill="white" />
            </svg>
          </span>
          작업내용
        </h3>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors"><span className={`transition-transform duration-300 font-bold text-xs ${isOpen ? 'rotate-180' : ''}`}>▼</span></div>
      </div>

      <div className={`grid transition-[grid-template-rows,opacity,margin] duration-400 ease-in-out relative z-10 ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-3 sm:mt-4' : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'}`}>
        <div className="overflow-hidden min-h-0 p-1 -m-1">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">볼링공 모델명 / 작업</label>
                <input type="text" value={ballName} onChange={e => onBallNameChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:font-medium placeholder:text-slate-400" placeholder="예: 페이즈 4" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">레이아웃 (Dual Angle 등)</label>
                <input type="text" value={layoutInfo} onChange={e => onLayoutInfoChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:font-medium placeholder:text-slate-400" placeholder="예: 50 x 4 x 30" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">상담 내용 및 지공 의도</label>
              <textarea value={intent} onChange={e => onIntentChange(e.target.value)} rows="5" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:font-medium placeholder:text-slate-400" placeholder="특이사항, 지공 변경 이유, 고객 요청사항 등을 자유롭게 기록하세요." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
