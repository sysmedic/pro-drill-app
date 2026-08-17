import { useState, useEffect } from "react";
import ModalShell from "../../components/ui/ModalShell.jsx";
import useSyncedPingStyle from "../../hooks/useSyncedPingStyle.js";

export default function GeneralSettingsModal({ onClose, onFeedback: propOnFeedback }) {
  const onFeedback = propOnFeedback || (() => {});
  const [lockTriggerEnabled, setLockTriggerEnabled] = useState(true);
  const [showLogsOnChart, setShowLogsOnChart] = useState(true);
  const [expandInputAccordions, setExpandInputAccordions] = useState(true);
  const [autoCollapseAccordions, setAutoCollapseAccordions] = useState(false);
  const [expandBowlerSpec, setExpandBowlerSpec] = useState(true);
  const [showManualHelp, setShowManualHelp] = useState(true);
  const [hideProfileName, setHideProfileName] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    setLockTriggerEnabled(localStorage.getItem("drilling_lock_trigger_enabled") !== "false");
    setShowLogsOnChart(localStorage.getItem("showLogsOnChart") !== "false");

    const autoVal = localStorage.getItem("autoCollapseInputAccordions") === "true";
    const expandVal = localStorage.getItem("expandInputAccordions");

    if (autoVal) {
      setAutoCollapseAccordions(true);
      setExpandInputAccordions(false);
    } else if (expandVal === "false") {
      setExpandInputAccordions(false);
      setAutoCollapseAccordions(false);
    } else {
      setExpandInputAccordions(true);
      setAutoCollapseAccordions(false);
    }

    setExpandBowlerSpec(localStorage.getItem("expandBowlerSpec") !== "false");
    setShowManualHelp(localStorage.getItem("show_manual_help") !== "false");
    setHideProfileName(localStorage.getItem("hide_profile_name") !== "false");
  }, []);

  const handleToggleLockTrigger = () => {
    const nextVal = !lockTriggerEnabled;
    setLockTriggerEnabled(nextVal);
    localStorage.setItem("drilling_lock_trigger_enabled", nextVal ? "true" : "false");
    onFeedback({ 
      message: "화면 잠금 기능이 " + (nextVal ? "활성화" : "비활성화") + "되었습니다.", 
      tone: "success" 
    });
  };

  const handleToggleShowLogsOnChart = () => {
    const nextVal = !showLogsOnChart;
    setShowLogsOnChart(nextVal);
    localStorage.setItem("showLogsOnChart", nextVal ? "true" : "false");
    onFeedback({ 
      message: "지공 이력 자동 팝업 기능이 " + (nextVal ? "활성화" : "비활성화") + "되었습니다.", 
      tone: "success" 
    });
  };

  const handleToggleExpandAll = () => {
    const nextVal = !expandInputAccordions;
    setExpandInputAccordions(nextVal);
    if (nextVal) {
      setAutoCollapseAccordions(false);
      localStorage.setItem("expandInputAccordions", "true");
      localStorage.setItem("autoCollapseInputAccordions", "false");
      onFeedback({ message: "입력창 아코디언 [모두 펼치기] 옵션이 활성화되었습니다.", tone: "success" });
    } else {
      localStorage.setItem("expandInputAccordions", "false");
      onFeedback({ message: "입력창 아코디언 [모두 펼치기] 옵션이 해제되었습니다.", tone: "info" });
    }
  };

  const handleToggleAutoCollapse = () => {
    const nextVal = !autoCollapseAccordions;
    setAutoCollapseAccordions(nextVal);
    if (nextVal) {
      setExpandInputAccordions(false);
      localStorage.setItem("autoCollapseInputAccordions", "true");
      localStorage.setItem("expandInputAccordions", "false");
      onFeedback({ message: "입력창 아코디언 [자동 접기] 옵션이 활성화되었습니다.", tone: "success" });
    } else {
      localStorage.setItem("autoCollapseInputAccordions", "false");
      onFeedback({ message: "입력창 아코디언 [자동 접기] 옵션이 해제되었습니다.", tone: "info" });
    }
  };

  const handleToggleExpandBowlerSpec = () => {
    const nextVal = !expandBowlerSpec;
    setExpandBowlerSpec(nextVal);
    localStorage.setItem("expandBowlerSpec", nextVal ? "true" : "false");
    onFeedback({
      message: "볼러스펙 펼치기 기능이 " + (nextVal ? "활성화" : "비활성화") + "되었습니다.",
      tone: "success"
    });
  };

  const handleToggleShowManualHelp = () => {
    const nextVal = !showManualHelp;
    setShowManualHelp(nextVal);
    localStorage.setItem("show_manual_help", nextVal ? "true" : "false");
    window.dispatchEvent(new Event("manual_help_setting_changed"));
    onFeedback({
      message: "매뉴얼 가이드 도움말이 " + (nextVal ? "활성화" : "비활성화") + "되었습니다.",
      tone: "success"
    });
  };

  const handleToggleHideProfileName = () => {
    const nextVal = !hideProfileName;
    setHideProfileName(nextVal);
    localStorage.setItem("hide_profile_name", nextVal ? "true" : "false");
    window.dispatchEvent(new Event("profile_hide_setting_changed"));
    onFeedback({
      message: "상단 프로필 이름 가리기가 " + (nextVal ? "활성화(숨김)" : "비활성화(노출)") + "되었습니다.",
      tone: "success"
    });
  };

  return (
    <ModalShell onClose={onClose} size="sm" title="⚙️ 환경 설정">
      <div className="p-5 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          {/* 차트 보호 */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 mb-0.5">
                차트 보호
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                앱 내 모든 빈 공간 3회 터치로 화면을 잠그며, 비활성화 시 도면 영역 3회 터치로만 잠급니다.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleToggleLockTrigger}
              className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (lockTriggerEnabled ? "bg-indigo-600" : "bg-slate-300")}
              aria-label="화면 잠금 기능 활성화 여부 토글"
            >
              <span
                className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (lockTriggerEnabled ? "translate-x-4" : "translate-x-0")}
              />
            </button>
          </div>

          {/* 타임라인 로그 */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 mb-0.5">
                타임라인 로그
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                차트 진입 시 최근 지공 변경 이력 팝업을 즉시 표시합니다.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleToggleShowLogsOnChart}
              className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (showLogsOnChart ? "bg-indigo-600" : "bg-slate-300")}
              aria-label="타임라인 로그 자동 노출 여부 토글"
            >
              <span
                className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (showLogsOnChart ? "translate-x-4" : "translate-x-0")}
              />
            </button>
          </div>

          {/* 입력창 아코디언 박스 설정 영역 */}
          <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
            <div>
              <h4 className="text-sm font-black text-slate-800 mb-0.5">
                입력창 아코디언 박스
              </h4>
            </div>

            <div className="space-y-2 pt-0.5">
              {/* 서브 옵션 1: 모두 펼치기 */}
              <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-white border border-slate-200/80">
                <div className="flex-1">
                  <span className="text-[12px] font-bold text-slate-800">모두 펼치기</span>
                  <p className="text-[10.5px] font-medium text-slate-500 leading-tight">
                    차트 편집 진입 시 모든 수치 입력 박스를 자동으로 모두 펼쳐서 보여줍니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (expandInputAccordions ? "bg-indigo-600" : "bg-slate-300")}
                  aria-label="입력창 모두 펼치기 토글"
                >
                  <span
                    className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (expandInputAccordions ? "translate-x-4" : "translate-x-0")}
                  />
                </button>
              </div>

              {/* 서브 옵션 2: 자동 접기 */}
              <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-white border border-slate-200/80">
                <div className="flex-1">
                  <span className="text-[12px] font-bold text-slate-800">자동 접기</span>
                  <p className="text-[10.5px] font-medium text-slate-500 leading-tight">
                    입력 중인 박스만 펼치고, 다른 박스를 선택하면 이전 박스가 자동으로 접힙니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoCollapse}
                  className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (autoCollapseAccordions ? "bg-indigo-600" : "bg-slate-300")}
                  aria-label="입력창 자동 접기 토글"
                >
                  <span
                    className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (autoCollapseAccordions ? "translate-x-4" : "translate-x-0")}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 볼러스펙 카드 */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 mb-0.5">
                볼러스펙 카드
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                차트 상단 볼러스펙 카드를 항상 접지 않고 펼쳐서 표시합니다.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleToggleExpandBowlerSpec}
              className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (expandBowlerSpec ? "bg-indigo-600" : "bg-slate-300")}
              aria-label="볼러스펙 기본 펼치기 토글"
            >
              <span
                className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (expandBowlerSpec ? "translate-x-4" : "translate-x-0")}
              />
            </button>
          </div>

          {/* 가이드 도움말 ? */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 mb-0.5">
                <span>가이드 도움말</span>
                <div className="relative flex items-center justify-center shrink-0">
                  <span 
                    className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" 
                    style={syncedPingStyle} 
                  />
                  <span className="relative z-10 w-5 h-5 rounded-full bg-slate-200/60 text-slate-700 border border-slate-300/50 backdrop-blur-xs flex items-center justify-center font-black text-[11px] leading-none shadow-xs">
                    ?
                  </span>
                </div>
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                매뉴얼 가이드 도움말 버튼을 항시 노출합니다.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleToggleShowManualHelp}
              className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (showManualHelp ? "bg-indigo-600" : "bg-slate-300")}
              aria-label="테스크바 매뉴얼 노출 여부 토글"
            >
              <span
                className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (showManualHelp ? "translate-x-4" : "translate-x-0")}
              />
            </button>
          </div>

          {/* 프로필 */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200/60">
            <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800 mb-0.5">
                프로필
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                테스크바에 지공사 프로필 이름 노출을 가립니다
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleToggleHideProfileName}
              className={"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none " + (hideProfileName ? "bg-indigo-600" : "bg-slate-300")}
              aria-label="상단 프로필 이름 가리기 토글"
            >
              <span
                className={"pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (hideProfileName ? "translate-x-4" : "translate-x-0")}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button 
            onClick={onClose} 
            type="button"
            className="w-full sm:w-24 py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
