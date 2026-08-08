import { useState, useEffect } from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

export default function GeneralSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [lockTriggerEnabled, setLockTriggerEnabled] = useState(true);
  const [showLogsOnChart, setShowLogsOnChart] = useState(true);
  const [expandInputAccordions, setExpandInputAccordions] = useState(false);
  const [expandBowlerSpec, setExpandBowlerSpec] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    // 설정값 복원
    setLockTriggerEnabled(localStorage.getItem('drilling_lock_trigger_enabled') !== 'false');
    setShowLogsOnChart(localStorage.getItem('showLogsOnChart') !== 'false');
    setExpandInputAccordions(localStorage.getItem('expandInputAccordions') === 'true');
    setExpandBowlerSpec(localStorage.getItem('expandBowlerSpec') === 'true');
    setShowManualHelp(localStorage.getItem('show_manual_help') !== 'false');
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

  const handleToggleShowManualHelp = () => {
    const nextVal = !showManualHelp;
    setShowManualHelp(nextVal);
    localStorage.setItem('show_manual_help', nextVal ? 'true' : 'false');
    window.dispatchEvent(new Event('manual_help_setting_changed'));
    onFeedback({
      message: `테스크바 매뉴얼 가이드가 ${nextVal ? '활성화' : '비활성화'}되었습니다.`,
      tone: 'success'
    });
  };



  return (
    <ModalShell onClose={onClose} size="sm" title="⚙️ 환경 설정">
      <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">

        {/* 설정 그룹 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          {/* 첫 번째 설정 항목: 화면 잠금 */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                🔒 차트 보호
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                앱 내 모든 빈 공간 3회 터치로 화면을 잠그며, 비활성화 시 도면 영역 3회 터치로만 잠급니다.
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

          {/* 두 번째 설정 항목: 타임라인 로그 보기 */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                📁 타임라인 로그 보기
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

          {/* 다섯 번째 설정 항목: ? 가이드 보기 */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                <span className="relative flex items-center justify-center shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                  <span className="relative z-10 w-5 h-5 rounded-full bg-slate-200/60 text-slate-700 border border-slate-300/50 flex items-center justify-center font-black text-[11px]">?</span>
                </span>
                가이드 보기
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed flex items-center flex-wrap gap-1">
                <span>앱 사용 가이드</span>
                <span className="relative inline-flex items-center justify-center shrink-0 mx-0.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                  <span className="relative z-10 w-4 h-4 rounded-full bg-slate-200/60 text-slate-700 border border-slate-300/50 flex items-center justify-center font-black text-[10px]">?</span>
                </span>
                <span>버튼을 노출합니다.</span>
              </p>
            </div>
            
            {/* 토글 스위치 버튼 */}
            <button
              type="button"
              onClick={handleToggleShowManualHelp}
              className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showManualHelp ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              aria-label="테스크바 매뉴얼 가이드 여부 토글"
            >
              <span
                className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showManualHelp ? 'translate-x-4.5' : 'translate-x-0'
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
