export default function CustomerHeader({ customerCount, onAdd, onOptimize, searchQuery, setSearchQuery, sortType, setSortType }) {
  return (
    <div className="bg-white/95 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 border-b-[4px] border-b-slate-300 mb-4 sm:mb-6 sticky top-2 z-[50] flex flex-col gap-3 w-full">
      <div className="flex justify-between items-center w-full">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-1.5">🎳 고객 관리</h1>
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5 ml-1">등록된 고객: {customerCount}명</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onOptimize}
            className="bg-gradient-to-b from-white to-slate-100 text-slate-600 border border-slate-200 shadow-sm rounded-lg font-bold text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 transition-all hover:to-slate-200 active:scale-95"
          >
            📱 최적화
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="bg-gradient-to-b from-indigo-500 to-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-black shadow-md border border-indigo-700 border-b-[3px] active:border-b-[1px] active:translate-y-[2px] text-sm sm:text-base transition-all shrink-0"
          >
            + 신규
          </button>
        </div>
      </div>

      {/* 2층: 통합된 검색창과 소팅 옵션 */}
      <div className="flex gap-2 w-full">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="이름 또는 연락처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-200 shadow-sm font-bold text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:font-medium bg-slate-50 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-base opacity-60">🔍</span>
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 bg-slate-200 hover:bg-slate-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black transition-colors">✕</button>
          )}
        </div>
        
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg pl-3 pr-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm shrink-0 cursor-pointer"
        >
          <option value="latest">최신순</option>
          <option value="name">이름순</option>
        </select>
      </div>
    </div>
  );
}
