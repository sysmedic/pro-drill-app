import React, { useState, useEffect } from 'react';
import { calculateGracePeriod } from '../../lib/userLicenseManager.js';

const GlassBox = ({ children, onClick, className = '' }) => (
  <div 
    onClick={onClick}
    className={`bg-black/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-300 hover:bg-white/5 active:scale-[0.98] cursor-pointer ${className}`}
  >
    {children}
  </div>
);

const formatCreatedTime = (createdAt) => {
  if (!createdAt) return '';
  let d;
  if (typeof createdAt.toDate === 'function') {
    d = createdAt.toDate();
  } else if (createdAt instanceof Date) {
    d = createdAt;
  } else if (createdAt.seconds) {
    d = new Date(createdAt.seconds * 1000);
  } else {
    d = new Date(createdAt);
  }

  if (isNaN(d.getTime())) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  let hh = d.getHours();
  const ampm = hh >= 12 ? '오후' : '오전';
  hh = hh % 12;
  hh = hh ? hh : 12;
  const hhStr = String(hh).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}. ${mm}. ${dd}. ${ampm} ${hhStr}:${min}`;
};

export default function CustomerHistoryModal({ 
  isOpen, 
  isManualOpen = false, // 💡 [진입 분기]: 수동(기록 버튼 클릭) 및 자동(고객카드 클릭) 경로 식별 추가
  onClose, 
  customer, 
  onLoadRecord,
  history = [],
  maxChartsAllowed,
  currentChartsCount,
  onRename,
  onDelete,
  showLogsOnChart = true,
  onToggleLogsVisibility,
  userTier // 🟢 상위 등급 라이선스 수령 통로 수립 완료
}) {
  // 🟢 [기본 진입 분기]: 모든 사용자에게 개방됨. 수동 진입은 'history', 자동 진입은 'timeline' 우선
  const [activeTab, setActiveTab] = useState(() => {
    return isManualOpen ? 'history' : 'timeline';
  });

  // 🟢 [동적 안전 동기화 이펙트]: 모달이 실시간 호출되어 오픈되는 순간 진입 방식에 따른 기본 탭 정밀 재조정
  useEffect(() => {
    if (isOpen) {
      setActiveTab(isManualOpen ? 'history' : 'timeline');
    }
  }, [isOpen, isManualOpen]);

  if (!isOpen) return null;

  const logs = customer?.activityLogs ? [...customer.activityLogs].reverse() : [];

  // [동일 차트 일관 색상 이식]: 중복 제거된 고유 차트 ID 풀과 부드러운 순환 칼라셋 정밀 수립
  const uniqueChartIds = Array.from(new Set(logs.map(l => l.chartId).filter(Boolean)));
  
  // [고도화 반영]: 15개 타임라인 로그 맥스 큐 스펙에 맞춰 15가지 고유 칼라셋으로 정밀 확장 완료
  const accessoryColors = [
    'bg-indigo-400',  // 1. 인디고
    'bg-teal-400',    // 2. 테일
    'bg-emerald-400', // 3. 에메랄드
    'bg-amber-400',   // 4. 앰버
    'bg-rose-400',    // 5. 로즈
    'bg-sky-400',     // 6. 스카이
    'bg-fuchsia-400', // 7. 푹시아
    'bg-orange-400',  // 8. 오렌지
    'bg-lime-400',    // 9. 라임
    'bg-violet-400',  // 10. 바이올렛
    'bg-cyan-400',    // 11. 시안
    'bg-pink-400',    // 12. 핑크
    'bg-yellow-400',  // 13. 옐로우
    'bg-purple-400',  // 14. 퍼플
    'bg-red-400'      // 15. 레드
  ];

  const handleSelectRecord = (recordOrId) => {
    if (!recordOrId) return;
    onLoadRecord(recordOrId); 
    onClose(); 
  };

  return (
    <div 
      role="dialog"
      aria-label="저장 기록"
      className="fixed inset-0 z-[40] bg-slate-900 overflow-y-auto overflow-x-hidden touch-auto animate-fade-in flex flex-col items-center"
    >
      
      {/* 1. 상단 고정 헤더 */}
      <div className="sticky top-0 w-full flex flex-col z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 safe-top">
        <div className="flex justify-between items-center p-3 px-4 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* [인터페이스 단순화 수정]: 중복 타이틀 문구를 과감히 제거하고 오직 회원 이름만 깔끔하게 구성 */}
            <h2 className="text-lg font-bold text-white flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
              {customer?.name}
            </h2>
          </div>

          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* 상단 탭 버튼 구역을 항상 노출 */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all border ${
              activeTab === 'timeline' 
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
              : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
            }`}
          >
            타임라인 로그
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all border ${
              activeTab === 'history' 
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
              : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
            }`}
          >
            지공 기록 ({history.length})
          </button>
        </div>
      </div>

      {/* 3. 메인 컨텐츠 영역 */}
      <div className="relative w-full max-w-[600px] flex-1 mt-2 p-4 sm:p-6 pb-20 safe-bottom">
        
        {/* 타임라인 로그 탭 컨텐츠 */}
        {activeTab === 'timeline' && (
          logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-white/50">
              <span className="text-4xl mb-4 opacity-50">📭</span>
              <p className="text-base font-medium">기록된 타임라인 로그가 없습니다.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-white/10 ml-3 sm:ml-4">
              {logs.map((log) => {
                const chartColorIndex = uniqueChartIds.indexOf(log.chartId);
                const circleColorClass = chartColorIndex !== -1 
                  ? accessoryColors[chartColorIndex % accessoryColors.length] 
                  : 'bg-slate-400';

                return (
                  <div key={log.id} className="mb-6 ml-5 sm:ml-6 relative group">
                    <span className={`absolute -left-[27px] sm:-left-[31px] top-4 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-[3px] border-slate-900 shadow-sm transition-transform duration-300 group-hover:scale-125 ${circleColorClass}`} />
                    <GlassBox onClick={() => handleSelectRecord(log.chartId)}>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-black text-indigo-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-md break-keep uppercase tracking-wider">
                          {log.ballName}
                        </span>
                        <span className="text-[10px] sm:text-xs text-white/50 font-medium whitespace-nowrap pt-1">
                          {log.date}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-white/90 font-bold mb-2 leading-snug line-clamp-3">
                        {log.message}
                      </p>
                      {log.layoutInfo && (
                        <div className="mt-3 text-xs sm:text-sm text-white/70 bg-white/5 p-2.5 rounded-lg border border-white/10 flex items-center gap-2">
                          <span className="font-bold text-white/40 flex-shrink-0">레이아웃</span> 
                          <span className="font-medium text-yellow-200/90 truncate">{log.layoutInfo}</span>
                        </div>
                      )}
                    </GlassBox>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 지공 기록 탭 컨텐츠 */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            <div className="px-2 mb-2 flex justify-between items-end">
              <span className="text-xs font-bold text-white/30 tracking-tight">전체 기록 목록</span>
              <span className="text-[10px] font-black text-indigo-300 bg-indigo-50/20 px-2 py-1 rounded-lg border border-indigo-500/30">
                총 {history.length}개
              </span>
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/50">
                <span className="text-4xl mb-4 opacity-50">📁</span>
                <p className="text-base font-medium">저장된 지공 기록이 없습니다.</p>
              </div>
            ) : (
              history.map((record) => (
                <GlassBox key={record.id} onClick={() => handleSelectRecord(record)} className="relative group overflow-hidden">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-indigo-300 font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          RECORD
                        </span>
                        <span className="text-[10px] text-white/40 font-bold">{formatCreatedTime(record.createdAt)}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white mb-1 truncate group-hover:text-indigo-200 transition-colors">
                        {record.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-white/60 font-bold flex items-center gap-1.5">
                        <span className="text-white/40 font-black">마지막 수정:</span>
                        <span className="text-indigo-200/90 font-medium">{record.timestamp}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0 pt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onRename(record.id, record.name); }}
                        className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/20 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                        title="이름 변경"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                        className="w-9 h-9 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 transition-all"
                        title="기록 삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </GlassBox>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}