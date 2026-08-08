import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card.jsx';
import Field from '../../components/ui/Field.jsx';
import Icon from '../../components/ui/Icon.jsx';
import TaskbarHelpBalloon from '../../components/ui/TaskbarHelpBalloon.jsx';
import { ConfirmModal } from '../../components/ui/Dialogs.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

const taskDetailsManualSections = [
  {
    items: [
      { title: "볼링공 모델명", desc: "지공 작업 대상 볼링공 명칭을 정확히 입력합니다." },
      { title: "레이아웃 (Dual Angle)", desc: "Pin to PAP x PSA x Buffer 수치를 입력합니다." },
      { iconName: "star", title: "AI 추천", desc: "볼러스펙과 공 제원을 바탕으로 최적의 레이아웃 4종을 추천받습니다." },
      { iconName: "history", title: "2LS 변환", desc: "Dual Angle 수치를 Storm 2LS 수치로 즉시 상호 자동 계산 변환합니다." },
      { title: "지공 의도 및 상담", desc: "고객 요청사항, 트랙 특성, 지공 목적을 자유롭게 작성합니다." },
      { title: "관리 내역 추가", desc: "지공 후 샌딩, 폴리싱, 핑거 교체 등 정비 이력을 기록합니다." }
    ]
  }
];

const getFormattedDate = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  let hh = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ampm = hh >= 12 ? '오후' : '오전';
  hh = hh % 12 || 12;
  return `${yy}. ${MM}. ${dd}. ${ampm} ${hh}:${mm}:${ss}`;
};

export default function TaskDetailsCard({
  ballName, innerRef, intent, layoutInfo,
  memoOverlay, memosRenderer, onBallNameChange, onIntentChange, onLayoutInfoChange,
  chartData, onChartDataChange, setHasUnsavedChanges, isNewChart,
  // 🎯 부모 컴포넌트(ChartDetail)에서 구동할 하드웨어 상태 플래그 및 태깅 핸들러 주입 허용
  realNfcSupported, onNfcWrite,
  // 🤖 AI 추천 및 2LS 변환용 프롭 추가
  onTriggerAiRecommend, onTrigger2LsConvert
}) {
  const showNfcWriteButton = false;
  const [logInput, setLogInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetLogId, setTargetLogId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showManualHelpSetting, setShowManualHelpSetting] = useState(true);
  const syncedPingStyle = useSyncedPingStyle();

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

  const logs = Array.isArray(chartData?.maintenanceLogs) ? chartData.maintenanceLogs : [];

  const commitLogs = (nextLogs) => {
    const updatedChartData = { ...(chartData || {}), maintenanceLogs: nextLogs };
    onChartDataChange(updatedChartData);
    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  };

  const handleIntentChange = (e) => {
    const val = e.target.value;
    onIntentChange(val); 
  };

  const handleAddLogTrigger = (e) => {
    if (e.key && e.key !== 'Enter') return;
    e.preventDefault();
    
    const trimmed = logInput.trim();
    if (!trimmed) return;
    
    const newLog = { id: new Date().getTime().toString(), text: trimmed, date: getFormattedDate() };
    commitLogs([...logs, newLog]);
    
    setLogInput('');
  };

  const triggerRemoveLogModal = (idToRemove) => {
    setTargetLogId(idToRemove);
    setIsDeleteModalOpen(true);
  };

  const confirmRemoveLog = () => {
    if (targetLogId) {
      commitLogs(logs.filter((log) => log.id !== targetLogId));
    }
    setIsDeleteModalOpen(false);
    setTargetLogId(null);
  };

  return (
    <Card ref={innerRef} className="mt-0 transition-all" elevation="md" layer="content" padding="md">
      {memoOverlay}
      {memosRenderer}

      <div className="flex w-full items-center justify-between select-none relative z-10 rounded-xl text-left">
        <span className="font-black text-slate-800 text-sm sm:text-base pl-1 flex items-center gap-1.5">
          <Icon name="ball" className="text-slate-700" size={20} />
          작업내용
          {/* 💡 [작업내용 반투명 3초 맥동 도움말 버튼] */}
          {showManualHelpSetting && (
            <span 
              className="relative inline-flex shrink-0 ml-1 z-20"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowHelp(prev => !prev);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="relative z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-200/60 hover:bg-slate-200/90 text-slate-700 border border-slate-300/50 backdrop-blur-xs shadow-xs flex items-center justify-center font-black text-xs sm:text-sm transition-transform active:scale-95 cursor-pointer focus:outline-none"
                aria-label="작업내용 가이드"
                title="작업내용 가이드"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                ?
              </button>
              <TaskbarHelpBalloon 
                isOpen={showHelp} 
                onClose={() => setShowHelp(false)} 
                title="📖 레이아웃 & 지공 / 작업"
                sections={taskDetailsManualSections}
              />
            </span>
          )}
        </span>

        {showNfcWriteButton && realNfcSupported && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (onNfcWrite) onNfcWrite(e); }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 shrink-0 cursor-pointer focus:outline-none"
            >
              NFC 쓰기
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-3 sm:mt-4">
        <div className="p-1 -m-1">
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="볼링공 모델명 / 작업" onChange={e => onBallNameChange(e.target.value)} placeholder="예: 페이즈 4" type="text" value={ballName} />
              
              <div className="relative w-full flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="layout-info-input" className="text-xs font-bold text-slate-700">레이아웃 (Dual Angle 등)</label>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={onTriggerAiRecommend}
                      className="px-2 py-0.5 bg-indigo-100/80 hover:bg-indigo-200 text-indigo-900 border border-indigo-200 rounded-md text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer outline-none shadow-xs"
                    >
                      ✨ AI 추천
                    </button>
                    {layoutInfo && (layoutInfo.includes('x') || layoutInfo.includes('X') || layoutInfo.includes('*') || layoutInfo.includes('-')) && (
                      <button
                        type="button"
                        onClick={onTrigger2LsConvert}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md text-[11px] font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer outline-none shadow-xs"
                      >
                        🔄 {layoutInfo.includes('(2LS)') ? 'Dual 변환' : '2LS 변환'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative w-full">
                  <Field id="layout-info-input" onChange={e => onLayoutInfoChange(e.target.value)} placeholder="예: 50 x 4 x 30" type="text" value={layoutInfo} />
                </div>
              </div>
            </div>
            
            <Field as="textarea" controlClassName="text-base text-slate-700 resize-none" label="지공 의도 및 상담 내용" onChange={handleIntentChange} placeholder="특이사항, 지공 변경 이유, 고객 요청사항 등을 자유롭게 기록하세요." rows="3" value={intent} />
            
            {!isNewChart && (
              <div className="pt-2 space-y-4">
                
                {logs.length > 0 && (
                  <div className="space-y-2 w-full">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shadow-sm animate-fade-in"
                      >
                        <span className="font-bold text-slate-800 text-sm truncate mr-4">{log.text}</span>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-slate-400 text-[11px] font-medium whitespace-nowrap">
                            {log.date}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => triggerRemoveLogModal(log.id)} 
                            className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-0.5 ml-1"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1 w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-2 pl-1">
                    관리 내역 <span className="text-slate-400 font-normal text-xs ml-1">(정비 내역을 추가 하세요)</span>
                  </label>
                  <div className="flex gap-2 w-full">
                    <input
                      type="text"
                      value={logInput}
                      onChange={(e) => setLogInput(e.target.value)}
                      onKeyDown={handleAddLogTrigger}
                      placeholder="내역을 입력하고 추가 버튼을 누르세요"
                      className="w-full flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleAddLogTrigger}
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition flex-shrink-0"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <ConfirmModal
          cancelLabel="취소"
          confirmLabel="삭제"
          danger={true}
          message="선택하신 관리 내역을 정말 삭제하시겠습니까?"
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setTargetLogId(null);
          }}
          onConfirm={confirmRemoveLog}
          title="관리 내역 삭제"
          titleId="maintenance-log-delete-title"
        />
      )}
    </Card>
  );
}