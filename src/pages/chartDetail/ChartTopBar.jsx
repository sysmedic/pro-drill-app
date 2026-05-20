import TopBarShell from '../../components/layout/TopBarShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function ChartTopBar({
  isEditMode,
  utilityState,
  viewingRecord,
  userTier,
  onBack,
  onStartMemo,
  onSave,
  onToggleEditMode,
  onToggleUtility,
  onShowTimeline,
  onConvertTemplate, // 🟢 추가됨: 배너 클릭 이벤트
}) {
  
  // 엑스퍼트 등급 이상인지 체크 (expert, pro, master 등)
  const isPremiumUser = userTier && ['expert', 'pro', 'master', 'admin'].includes(userTier.toLowerCase());

  return (
    <TopBarShell fixed variant="toolbar" className="flex flex-col w-full">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button aria-label="뒤로" className="max-[420px]:[&>span.leading-none]:hidden" icon="back" onClick={onBack} size="sm" variant="secondary">뒤로</Button>
          <Button aria-expanded={utilityState === 'expanded'} aria-label="유틸리티" className="max-[420px]:[&>span.leading-none]:hidden" icon="tools" onClick={onToggleUtility} size="sm" variant="secondary">
            유틸
          </Button>
          <Button aria-label="메모" className="max-[420px]:[&>span.leading-none]:hidden" onClick={onStartMemo} size="sm" variant="secondary" icon="memo">메모</Button>
          
          {/* 프리미엄 회원 전용 로그 버튼 (history 아이콘, 반응형 숨김 적용) */}
          {isPremiumUser && (
            <Button 
              aria-label="로그" 
              className="max-[420px]:[&>span.leading-none]:hidden text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" 
              onClick={onShowTimeline} 
              size="sm" 
              variant="secondary" 
              icon="history"
            >
              로그
            </Button>
          )}
        </div>

        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button
            aria-label={isEditMode ? '차트 보기로 전환' : '수정 모드로 전환'}
            icon={isEditMode ? 'chart' : 'edit'}
            onClick={onToggleEditMode}
            size="sm"
            title={isEditMode ? '차트 보기로 전환' : '수정 모드로 전환'}
            variant="secondary"
          >
            {isEditMode ? '차트' : '수정'}
          </Button>
          <Button icon="save" onClick={onSave} size="sm" variant="secondary" className="bg-indigo-200 text-indigo-800 hover:bg-indigo-300">저장</Button>
        </div>
      </div>
      
      {/* 🟢 수정됨: 배너를 클릭 가능한 버튼으로 변경 */}
      {viewingRecord && (
        <button 
          type="button"
          onClick={onConvertTemplate}
          className="w-full bg-slate-700 hover:bg-slate-600 transition-colors border border-slate-600 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg p-2 mt-2 flex items-center justify-center gap-2 text-slate-100 text-xs sm:text-sm shadow-sm animate-fade-in text-left cursor-pointer group"
        >
          <Icon name="history" size={16} className="text-slate-300 shrink-0 group-hover:text-amber-200 transition-colors" />
          <span className="truncate">
            현재 <strong className="text-amber-200">{viewingRecord.name}</strong> <span className="text-slate-300">({viewingRecord.timestamp})</span> 기록입니다. <span className="hidden sm:inline text-slate-400 ml-1 font-normal">(클릭하여 새 차트 생성)</span>
          </span>
        </button>
      )}
    </TopBarShell>
  );
}