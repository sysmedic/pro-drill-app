import TopBarShell from '../../components/layout/TopBarShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function ChartTopBar({
  isEditMode,
  utilityState,
  viewingRecord,
  onBack,
  onStartMemo,
  onSave,
  onToggleEditMode,
  onToggleUtility,
}) {
  return (
    <TopBarShell fixed variant="toolbar" className="flex flex-col w-full">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
        <Button aria-label="뒤로" className="max-[380px]:[&>span.leading-none]:hidden" icon="back" onClick={onBack} size="sm" variant="secondary">뒤로</Button>
        <Button aria-expanded={utilityState === 'expanded'} aria-label="유틸리티" className="max-[380px]:[&>span.leading-none]:hidden" icon="tools" onClick={onToggleUtility} size="sm" variant="secondary"
        >
          유틸
        </Button>
        <Button aria-label="메모" className="max-[380px]:[&>span.leading-none]:hidden" onClick={onStartMemo} size="sm" variant="secondary" icon="memo">메모</Button>
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
      
      {viewingRecord && (
        <div className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 mt-2 flex items-center justify-center gap-2 text-slate-100 text-xs sm:text-sm shadow-sm animate-fade-in">
          <Icon name="history" size={16} className="text-slate-300 shrink-0" />
          <span className="truncate">
            현재 <strong className="text-amber-200">{viewingRecord.name}</strong> <span className="text-slate-300">({viewingRecord.timestamp})</span> 기록입니다.
          </span>
        </div>
      )}
    </TopBarShell>
  );
}
