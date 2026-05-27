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
  onConvertTemplate,
  // Props 추가 연동
  sessionRecordId,
  ballName,
}) {
  
  // 엑스퍼트 등급 이상인지 체크 (expert, pro, master 등)
  const isPremiumUser = userTier && ['expert', 'pro', 'master', 'admin'].includes(userTier.toLowerCase());

  // 기존 불러오기 기록이 존재하거나 새 차트가 성공적으로 저장(ID 발급)된 모든 경우를 판단
  const isSavedChart = viewingRecord || sessionRecordId;
  const displayName = viewingRecord ? viewingRecord.name : ballName;
  
  // 새 차트 실시간 저장 시 배너용 일자 생성 서식 (YYMMDD)
  const displayTimestamp = viewingRecord ? viewingRecord.timestamp : (() => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
  })();

  return (
    <TopBarShell fixed variant="toolbar" className="flex flex-col w-full">
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button aria-label="뒤로" className="max-[420px]:[&>span.leading-none]:hidden" icon="back" onClick={onBack} size="sm" variant="secondary">뒤로</Button>
          
          {/* 🟢 변경됨: 상세 설정창(isEditMode)이 열렸을 때는 유틸 버튼 가림 처리 */}
          {!isEditMode && (
            <Button aria-expanded={utilityState === 'expanded'} aria-label="유틸리티" className="max-[420px]:[&>span.leading-none]:hidden" icon="tools" onClick={onToggleUtility} size="sm" variant="secondary">
              유틸
            </Button>
          )}
          
          {/* 🎯 상세 설정창(isEditMode)이 열렸을 때는 메모 버튼 가림 처리 */}
          {!isEditMode && (
            <Button aria-label="메모" className="max-[420px]:[&>span.leading-none]:hidden" onClick={onStartMemo} size="sm" variant="secondary" icon="memo">메모</Button>
          )}
          
          {/* 🟢 변경됨: 프리미엄 회원 전용 로그 버튼도 수정 모드(isEditMode) 시 가림 처리 */}
          {isPremiumUser && !isEditMode && (
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
            {isEditMode ? 'chart' : '수정'}
          </Button>
          <Button icon="save" onClick={onSave} size="sm" variant="secondary" className="bg-indigo-200 text-indigo-800 hover:bg-indigo-300">저장</Button>
        </div>
      </div>
      
      {/* 모든 저장된 차트 조건(isSavedChart) 및 안내 문구 text-slate-200 점멸 적용 */}
      {isSavedChart && (
        <button 
          type="button"
          onClick={onConvertTemplate}
          className="w-full bg-slate-700 hover:bg-slate-600 transition-colors border border-slate-600 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg p-2 mt-2 flex items-center justify-center gap-2 text-slate-100 text-xs sm:text-sm shadow-sm animate-fade-in text-left cursor-pointer group"
        >
          <Icon name="history" size={16} className="text-slate-300 shrink-0 group-hover:text-amber-200 transition-colors" />
          <span className="truncate">
            현재 <strong className="text-amber-200">{displayName}</strong> <span className="text-slate-300">({displayTimestamp})</span> 기록입니다. <span className="hidden sm:inline text-slate-200 ml-1 font-normal animate-pulse">(클릭하여 새 차트 생성)</span>
          </span>
        </button>
      )}
    </TopBarShell>
  );
}