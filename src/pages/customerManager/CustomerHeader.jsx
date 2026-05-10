import TopBarShell from '../../components/layout/TopBarShell.jsx';
import Button, { IconButton } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function CustomerHeader({ customerCount, onAdd, searchQuery, setSearchQuery, sortType, setSortType }) {
  return (
    <TopBarShell className="flex flex-col gap-3">
      <div className="flex justify-between items-center w-full">
        <div>
          <h1 className="text-xl font-black text-slate-800">고객 관리</h1>
          <p className="text-[11px] sm:text-xs font-bold text-slate-400 mt-0.5 ml-1">등록된 고객: {customerCount}명</p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button
            icon="plus"
            onClick={onAdd}
            size="md"
            variant="primary"
          >
            신규
          </Button>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="이름 또는 연락처 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-slate-200 shadow-sm font-bold text-[16px] sm:text-sm text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none placeholder:font-medium bg-slate-50 transition-all"
          />
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          {searchQuery && (
            <IconButton
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full"
              icon="close"
              onClick={() => setSearchQuery('')}
              size="xs"
              variant="plain"
            />
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
    </TopBarShell>
  );
}
