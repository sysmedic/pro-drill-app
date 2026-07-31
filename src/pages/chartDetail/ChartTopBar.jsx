import React, { useState, useEffect } from 'react';
import TopBarShell from '../../components/layout/TopBarShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { calculateGracePeriod } from '../../lib/userLicenseManager.js';

// ⏱️ [시간 세밀 조정 브릿지]: 교차 주기를 제어하는 ms 단위 변수입니다.
const ROLLING_INTERVAL = 3000;

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
  sessionRecordId,
  ballName,
  onTriggerLock,
}) {
  
  // 🔄 [교차 롤링용 상태 수립]: 좁은 모바일 화면을 효율적으로 활용하기 위한 텍스트 교차 플래그
  const [showAltText, setShowAltText] = useState(false);

  useEffect(() => {
    if (!viewingRecord && !sessionRecordId) return;

    const interval = setInterval(() => {
      setShowAltText(prev => !prev);
    }, ROLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [viewingRecord, sessionRecordId]);

  // 프리미엄 사용 권한을 master, certified 등급 또는 Trial 유예 경고 전 사용자로 허용합니다.
  const isPremiumUser = (() => {
    if (!userTier) return false;
    const ut = userTier.toLowerCase();
    if (['master', 'certified'].includes(ut)) return true;
    if (ut === 'trial') {
      const graceInfo = calculateGracePeriod();
      return !graceInfo.isExpired && graceInfo.daysLeft > 30;
    }
    return false;
  })();

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

  // 🟢 트리플 클릭 감지 시 화면 잠금 가동 로직
  const handleTaskbarClick = (e) => {
    if (e.detail === 3) {
      const targetTagName = e.target.tagName.toLowerCase();
      // 버튼, 입력창, 링크, SVG 아이콘 클릭 시에는 오잠금 방지 가드
      if (targetTagName === 'button' || targetTagName === 'input' || targetTagName === 'a' || e.target.closest('button') || e.target.closest('input')) {
        return;
      }
      if (onTriggerLock) {
        onTriggerLock();
      }
    }
  };

  return (
    <TopBarShell 
      fixed 
      variant="toolbar" 
      className="flex flex-col w-full cursor-pointer select-none"
      onClick={handleTaskbarClick}
    >
      <div className="flex justify-between items-center w-full gap-2">
        <div className="flex gap-1.5 sm:gap-2 shrink-0">
          <Button aria-label="뒤로" className="max-[420px]:[&>span.leading-none]:hidden" icon="back" onClick={onBack} size="sm" variant="secondary">뒤로</Button>
          
          {/* 유틸 버튼 (임시 비활성화 처리) */}
          {/* {!isEditMode && isPremiumUser && (
            <Button aria-expanded={utilityState === 'expanded'} aria-label="유틸리티" className="max-[420px]:[&>span.leading-none]:hidden" icon="tools" onClick={onToggleUtility} size="sm" variant="secondary">
              유틸
            </Button>
          )} */}
          
          {/* 메모 버튼 */}
          {!isEditMode && (
            <Button aria-label="메모" onClick={onStartMemo} size="sm" variant="secondary" icon="memo">메모</Button>
          )}
          
          {/* 버튼 이름 및 aria-label 명칭 명확화: "로그" ➔ "기록" */}
          {!isEditMode && (
            <Button 
              aria-label="기록" 
              className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100" 
              onClick={onShowTimeline} 
              size="sm" 
              variant="secondary" 
              icon="history"
            >
              기록
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
            className="max-[340px]:[&>span.leading-none]:hidden"
          >
            {isEditMode ? 'chart' : '수정'}
          </Button>
          <Button icon="save" onClick={onSave} size="sm" variant="secondary" className="bg-indigo-200 text-indigo-800 hover:bg-indigo-300 max-[340px]:[&>span.leading-none]:hidden">저장</Button>
        </div>
      </div>
      
      {/* 하단 기록 배너 */}
      {isSavedChart && (
        <button 
          type="button"
          onClick={onConvertTemplate}
          className="w-full bg-slate-700 hover:bg-slate-600 transition-colors border border-slate-600 hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg p-2 mt-2 flex items-center justify-center gap-2 text-slate-100 text-xs sm:text-sm shadow-sm animate-fade-in text-left cursor-pointer group"
        >
          <Icon name="history" size={16} className="text-slate-300 shrink-0 group-hover:text-amber-200 transition-colors" />
          
          <span className="truncate text-center w-full transition-all duration-300 ease-in-out">
            {showAltText ? (
              /* 🛠️ [수정 완료]: 요구사항에 따라 전두의 💡 이모지를 완전 소거하고 글자색을 text-white로 변경하여 깔끔하게 마감했습니다. */
              <span className="text-white font-bold animate-fade-in block">
                클릭하여 새 차트로 만들기
              </span>
            ) : (
              <span className="animate-fade-in block truncate">
                현재 <strong className="text-amber-200 font-bold">{displayName}</strong> <span className="text-slate-300">({displayTimestamp})</span> 기록입니다.
              </span>
            )}
          </span>
        </button>
      )}
    </TopBarShell>
  );
}