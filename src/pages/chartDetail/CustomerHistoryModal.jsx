import React from 'react';

// 🟢 레퍼런스 스타일을 반영한 유리 질감 카드 컴포넌트
const GlassBox = ({ children, onClick, className = '' }) => (
  <div 
    onClick={onClick}
    className={`bg-black/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all duration-300 hover:bg-white/5 active:scale-[0.98] cursor-pointer ${className}`}
  >
    {children}
  </div>
);

export default function CustomerHistoryModal({ isOpen, onClose, customer, onLoadRecord }) {
  if (!isOpen) return null;

  // 파이어베이스 arrayUnion은 순차적으로 들어가므로, 최신 내역이 위로 오도록 역순(reverse) 정렬
  const logs = customer?.activityLogs ? [...customer.activityLogs].reverse() : [];

  const handleLogClick = (chartId) => {
    if (!chartId) return;
    onLoadRecord(chartId); // 해당 차트 불러오기 실행
    onClose(); // 차트 이동 후 모달 닫기
  };

  return (
    // 🟢 1. 전체 배경: 다크 테마 적용 및 z-index 9999
    <div className="fixed inset-0 z-[9999] bg-slate-900 overflow-y-auto overflow-x-hidden touch-auto animate-fade-in flex flex-col items-center">
      
      {/* 🟢 2. 상단 고정 헤더 (블러 효과 및 다크 테마 탑재) */}
      <div className="sticky top-0 w-full flex justify-between items-center p-3 px-4 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 safe-top">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          타임라인 로그 <span className="text-white/50 font-medium mx-1">-</span> {customer?.name}
        </h2>
        <button 
          onClick={onClose} 
          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none"
        >
          ✕
        </button>
      </div>

      {/* 🟢 3. 메인 컨텐츠 영역 */}
      <div className="relative w-full max-w-[600px] flex-1 mt-2 p-4 sm:p-6 pb-20 safe-bottom">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-white/50">
            <span className="text-4xl mb-4 opacity-50">📭</span>
            <p className="text-base font-medium">아직 기록된 로그 히스토리가 없습니다.</p>
          </div>
        ) : (
          // 타임라인 세로선 (어두운 배경에 맞게 반투명 흰색 선으로 변경)
          <div className="relative border-l-2 border-white/10 ml-3 sm:ml-4">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="mb-6 ml-5 sm:ml-6 relative group"
              >
                {/* 🟢 타임라인 점 (다크테마 컷아웃 효과 적용) */}
                <span className={`absolute -left-[27px] sm:-left-[31px] top-4 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-[3px] border-slate-900 shadow-sm transition-transform duration-300 group-hover:scale-125 ${
                  log.actionType === 'CREATE' ? 'bg-indigo-400' : 'bg-teal-400'
                }`} />

                {/* 🟢 글래스모피즘이 적용된 개별 로그 박스 */}
                <GlassBox onClick={() => handleLogClick(log.chartId)}>
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
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}