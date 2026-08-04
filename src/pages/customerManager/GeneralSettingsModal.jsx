import { useState, useEffect } from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';

export default function GeneralSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [lockTriggerEnabled, setLockTriggerEnabled] = useState(true);
  const [showLogsOnChart, setShowLogsOnChart] = useState(true);
  const [expandInputAccordions, setExpandInputAccordions] = useState(false);
  const [expandBowlerSpec, setExpandBowlerSpec] = useState(false);

  useEffect(() => {
    // 설정값 복원
    setLockTriggerEnabled(localStorage.getItem('drilling_lock_trigger_enabled') !== 'false');
    setShowLogsOnChart(localStorage.getItem('showLogsOnChart') !== 'false');
    setExpandInputAccordions(localStorage.getItem('expandInputAccordions') === 'true');
    setExpandBowlerSpec(localStorage.getItem('expandBowlerSpec') === 'true');
  }, []);

  const handleToggleLockTrigger = () => {
    const nextVal = !lockTriggerEnabled;
    setLockTriggerEnabled(nextVal);
    localStorage.setItem('drilling_lock_trigger_enabled', nextVal ? 'true' : 'false');
    onFeedback({ 
      message: `화면 잠금 기능이 ${nextVal ? '활성화' : '비활성화'}되었습니다.`, 
      tone: 'success' 
    });
  };

  const handleToggleShowLogsOnChart = () => {
    const nextVal = !showLogsOnChart;
    setShowLogsOnChart(nextVal);
    localStorage.setItem('showLogsOnChart', nextVal ? 'true' : 'false');
    onFeedback({ 
      message: `지공 이력 자동 팝업 기능이 ${nextVal ? '활성화' : '비활성화'}되었습니다.`, 
      tone: 'success' 
    });
  };

  const handleToggleExpandInputAccordions = () => {
    const nextVal = !expandInputAccordions;
    setExpandInputAccordions(nextVal);
    localStorage.setItem('expandInputAccordions', nextVal ? 'true' : 'false');
    onFeedback({
      message: `입력창 펼치기 기능이 ${nextVal ? '활성화' : '비활성화'}되었습니다.`,
      tone: 'success'
    });
  };

  const handleToggleExpandBowlerSpec = () => {
    const nextVal = !expandBowlerSpec;
    setExpandBowlerSpec(nextVal);
    localStorage.setItem('expandBowlerSpec', nextVal ? 'true' : 'false');
    onFeedback({
      message: `볼러스펙 펼치기 기능이 ${nextVal ? '활성화' : '비활성화'}되었습니다.`,
      tone: 'success'
    });
  };

  return (
    <ModalShell onClose={onClose} size="sm" title="⚙️ 환경 설정">
      <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
        {/* 설명 영역 */}
        <p className="text-xs text-slate-500 leading-relaxed pl-1">
          ProDrill 앱의 작동 환경을 개인 설정에 맞게 변경할 수 있습니다.
        </p>

        {/* 설정 그룹 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          {/* 첫 번째 설정 항목: 화면 잠금 */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                🔒 차트 가리기
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                빈 화면이나 바탕화면을 3회 연속 터치(클릭)했을 때, 사생활 보호를 위해 즉시 화면 잠금을 가동합니다.
              </p>
            </div>
            
            {/* 토글 스위치 버튼 */}
            <button
              type="button"
              onClick={handleToggleLockTrigger}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                lockTriggerEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              aria-label="화면 잠금 기능 활성화 여부 토글"
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  lockTriggerEnabled ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 두 번째 설정 항목: 로그 보기 */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                📁 로그 보기
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                고객 차트 진입 시 이전에 저장된 지공 관리 이력 모달을 자동으로 화면에 전개합니다.
              </p>
            </div>
            
            {/* 토글 스위치 버튼 */}
            <button
              type="button"
              onClick={handleToggleShowLogsOnChart}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showLogsOnChart ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              aria-label="지공 이력 자동 팝업 여부 토글"
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showLogsOnChart ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 세 번째 설정 항목: 입력창 펼치기 */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                {"\uD83D\uDCCB"} 입력창 펼치기
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                차트 수정/입력 모드 진입 시 모든 지공 수치 아코디언박스를 기본 펼침 상태로 보여줍니다.
              </p>
            </div>
            
            {/* 토글 스위치 버튼 */}
            <button
              type="button"
              onClick={handleToggleExpandInputAccordions}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                expandInputAccordions ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              aria-label="입력창 펼치기 여부 토글"
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  expandInputAccordions ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 네 번째 설정 항목: 볼러스펙 펼치기 */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                {"\uD83D\uDC64"} 볼러스펙 펼치기
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                차트 상세창 진입 시 상단의 고객 볼러스펙 카드 정보창을 기본 펼침 상태로 보여줍니다.
              </p>
            </div>
            
            {/* 토글 스위치 버튼 */}
            <button
              type="button"
              onClick={handleToggleExpandBowlerSpec}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                expandBowlerSpec ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              aria-label="볼러스펙 펼치기 여부 토글"
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  expandBowlerSpec ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 닫기 액션 영역 */}
        <div className="flex justify-end pt-2">
          <button 
            onClick={onClose} 
            type="button"
            className="w-full sm:w-28 py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
          >
            확인
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
