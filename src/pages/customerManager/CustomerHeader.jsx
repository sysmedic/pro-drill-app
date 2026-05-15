import TopBarShell from '../../components/layout/TopBarShell.jsx';

export default function CustomerHeader({ 
  customerCount, onAdd, searchQuery, setSearchQuery, sortType, setSortType, 
  isAdmin, onOpenAdmin, isMenuOpen, setIsMenuOpen, onLogout 
}) {
  return (
    <TopBarShell fixed variant="toolbar" className="flex flex-col w-full p-4 bg-white rounded-2xl shadow-sm min-h-[110px]">
      
      {/* 📍 메뉴 외부 클릭 시 닫기용 투명 레이어 */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[998] bg-transparent" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* 📍 햄버거 버튼 및 메뉴 */}
      <div className="absolute top-2.5 left-4 z-[999]">
        <button 
          onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
          className="p-1 text-2xl text-slate-600 hover:bg-slate-100 rounded-lg transition-colors leading-none"
        >
          {isMenuOpen ? "✕" : "☰"}
        </button>
        
        {isMenuOpen && (
          <div className="absolute top-10 left-0 w-32 bg-white rounded-xl shadow-2xl border border-slate-100 p-1 z-[1000]">
            <button onClick={onLogout} className="w-full py-3 text-sm text-red-500 font-bold hover:bg-red-50 rounded-lg text-center">
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* 상단 라인: [☰] [고객 관리] [⚙️] ---------------- [+ 신규] */}
      <div className="flex justify-between items-start mb-1 pl-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-800">고객 관리</h1>
            {isAdmin && (
              <button onClick={onOpenAdmin} className="text-lg text-slate-300 hover:text-slate-600 p-1 transition-colors">
                ⚙️
              </button>
            )}
          </div>
          <div className="text-slate-400 text-[11px] mb-4">
            등록된 고객: <span className="font-bold text-slate-500">{customerCount}명</span>
          </div>
        </div>

        {/* 📍 신규 버튼: 외곽선(border-indigo-300) 추가 */}
        <button 
          onClick={onAdd}
          className="bg-indigo-200 text-indigo-800 border border-indigo-300 hover:bg-indigo-300 px-4 py-2 rounded-xl font-bold flex items-center gap-1 shadow-md shadow-indigo-100 active:scale-95 transition-all"
        >
          <span className="text-xl">+</span> 신규
        </button>
      </div>

      {/* 하단 라인: 검색창 및 정렬 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* 📍 검색창: border-none 제거 및 외곽선(border-slate-200) 추가 */}
          <input
            type="text"
            placeholder="이름 또는 연락처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-base focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
          {/* 📍 검색창 초기화 버튼 */}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 p-1 font-bold text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>
        {/* 📍 정렬 선택창: border-none 제거 및 외곽선(border-slate-200) 추가 */}
        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 outline-none"
        >
          <option value="latest">최신순</option>
          <option value="name">이름순</option>
        </select>
      </div>
    </TopBarShell>
  );
}