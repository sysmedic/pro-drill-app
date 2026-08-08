import { useState, useEffect, useRef } from 'react';
import TopBarShell from '../../components/layout/TopBarShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

// ⏱️ [시간 세밀 조정 브릿지]: 교차 주기를 제어하는 ms 단위 변수입니다.
const ROLLING_INTERVAL = 3000;

export default function ChartTopBar({
  isEditMode,
  viewingRecord,
  onBack,
  onStartMemo,
  onSave,
  onToggleEditMode,
  onShowTimeline,
  onConvertTemplate,
  sessionRecordId,
  ballName,
  onTriggerLock,
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();
  
  // 🔄 [교차 롤링용 상태 수립]: 좁은 모바일 화면을 효율적으로 활용하기 위한 텍스트 교차 플래그
  const [showAltText, setShowAltText] = useState(false);

  useEffect(() => {
    const handleUpdateSetting = () => {
      setShowManualHelpSetting(localStorage.getItem('show_manual_help') !== 'false');
    };
    handleUpdateSetting();
    window.addEventListener('manual_help_setting_changed', handleUpdateSetting);
    window.addEventListener('storage', handleUpdateSetting);
    return () => {
      window.removeEventListener('manual_help_setting_changed', handleUpdateSetting);
      window.removeEventListener('storage', handleUpdateSetting);
    };
  }, []);

  useEffect(() => {
    if (!viewingRecord && !sessionRecordId) return;

    const interval = setInterval(() => {
      setShowAltText(prev => !prev);
    }, ROLLING_INTERVAL);

    return () => clearInterval(interval);
  }, [viewingRecord, sessionRecordId]);

  // 매뉴얼 구성을 객체 배열로 정돈
  const manualSections = isEditMode ? [
    {
      items: [
        { iconName: "back", title: "1. [고객관리] 버튼", desc: "입력 중인 차트 데이터를 자동으로 즉시 저장한 후, 이전 메인 고객 명단 화면으로 빠져나갑니다." },
        { iconName: "chart", title: "2. [chart] 버튼", desc: "수치 입력 화면을 종료하고, 입력된 수치가 반영된 깔끔한 지공 차트 도면 화면으로 즉시 전환합니다." },
        { iconName: "save", title: "3. [저장] 버튼", desc: "현재 수치 입력창에서 변경하거나 추가한 모든 데이터(볼러 스펙, 레이아웃, 피치, 비벨, 메모 등)를 즉시 데이터베이스 및 구글 드라이브에 확정 저장합니다." }
      ]
    }
  ] : [
    {
      items: [
        { iconName: "back", title: "1. [고객관리] 버튼", desc: "터치 시 변경된 차트 내용을 안전하게 자동 저장하고 메인 고객 명단 화면으로 돌아갑니다." },
        { iconName: "memo", title: "2. [메모] 버튼", desc: "지공 도면 위의 원하는 위치(중지, 약지, 엄지, 핀 부근 등)를 터치하여 메모 핀을 붙이고 지공 메모를 작성할 수 있습니다." },
        { iconName: "history", title: "3. [기록] 버튼", desc: "지공 고객의 과거 차트 저장 기록 및 타임라인 이력 목록을 팝업으로 열어 과거 수치를 조회하고 불러올 수 있습니다." },
        { iconName: "edit", title: "4. [수정] 버튼", desc: "차트 수치를 변경할 수 있는 편집 모드로 즉시 전환합니다." },
        { iconName: "save", title: "5. [저장] 버튼", desc: "현재 작성하거나 수정한 차트 데이터를 로컬 DB 및 구글 드라이브 클라우드로 안전하게 즉시 저장합니다." },
        { iconName: "history", title: "6. [기록 배너] 버튼 (하단 롤링 배너)", desc: "\"현재 OO 기록입니다\" \u2194\uFE0F \"클릭하여 새 차트로 만들기\" 문구가 교차 표시되는 하단 배너를 터치하면, 현재 수치를 유지한 채 새 차트로 복제 생성이 가능합니다." }
      ],
      note: "🔒 비밀 화면 잠금 팁 (3회 연속 터치)\n• 차트 보호 OFF일 때: 지공 도면 영역 3회 연속 터치 시 화면 잠금 작동\n• 차트 보호 ON일 때: 차트 테스크바를 포함한 앱 내 모든 빈 공간 3회 연속 터치 시 화면 잠금 작동"
    }
  ];

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
      className="flex flex-col cursor-pointer select-none"
    >
      <div className="flex justify-between items-center w-full gap-2 relative">
        <div className="flex gap-1.5 sm:gap-2 shrink-0 items-center">
          <Button aria-label="고객관리" className="max-[420px]:[&>span.leading-none]:hidden" icon="back" onClick={onBack} size="sm" variant="secondary">고객관리</Button>
          
          {/* 유틸 버튼 (임시 비활성화 처리) */}
          {/* {!isEditMode && isPremiumUser && (
            <Button aria-expanded={utilityState === 'expanded'} aria-label="유틸리티" className="max-[420px]:[&>span.leading-none]:hidden" icon="tools" onClick={onToggleUtility} size="sm" variant="secondary">
              유틸
            </Button>
          )} */}
          
          {/* 메모 버튼 */}
          {!isEditMode && (
            <Button 
              aria-label="메모" 
              title="메모"
              onClick={onStartMemo} 
              size="sm" 
              variant="secondary" 
              icon="memo"
              className="max-[360px]:[&>span.leading-none]:hidden"
            >
              메모
            </Button>
          )}
          
          {/* 버튼 이름 및 aria-label 명칭 명확화: "로그" ➔ "기록" */}
          {!isEditMode && (
            <Button 
              aria-label="기록" 
              title="기록"
              className="text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 max-[360px]:[&>span.leading-none]:hidden" 
              onClick={onShowTimeline} 
              size="sm" 
              variant="secondary" 
              icon="history"
            >
              기록
            </Button>
          )}

          {/* 💡 [차트탑바 기록 버튼 바로 뒤 배치 3초 맥동 도움말 버튼] */}
          {showManualHelpSetting && (
            <div className="relative inline-flex items-center shrink-0 min-w-0 z-30 ml-0.5 sm:ml-1">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowHelp(prev => !prev);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs transition-transform active:scale-95 cursor-pointer focus:outline-none"
                  aria-label="테스크바 사용 매뉴얼"
                  title="테스크바 사용 매뉴얼"
                >
                  ?
                </button>
              </div>
              <TaskbarHelpBalloon 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title={isEditMode ? "📖 수치 입력 테스크바" : "📖 차트 테스크바"}
                sections={manualSections}
              />
            </div>
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
      {!isEditMode && isSavedChart && (
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