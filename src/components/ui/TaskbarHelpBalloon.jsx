import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import useSyncedPingStyle from '../../hooks/useSyncedPingStyle.js';

export default function TaskbarHelpBalloon({ 
  isOpen, 
  onClose, 
  title = "📖 사용 매뉴얼", 
  sections = []
}) {
  const balloonRef = useRef(null);
  const syncedPingStyle = useSyncedPingStyle();

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (balloonRef.current && !balloonRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined' || !document?.body) return null;

  return createPortal(
    <>
      {/* 💡 화면 전체 딤 백드롭 */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-[1px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 💡 디스플레이 최중앙 (Fixed Display Dead Center) 팝업 */}
      <div 
        ref={balloonRef}
        onClick={(e) => e.stopPropagation()}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[340px] max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-4 text-slate-800 animate-fade-in flex flex-col max-h-[80vh]"
        style={{ filter: 'drop-shadow(0 12px 24px rgba(0, 0, 0, 0.18))' }}
      >
        {/* 팝업 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3 shrink-0">
          <h3 className="text-xs sm:text-sm font-black text-indigo-900 flex items-center gap-1.5">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            aria-label="닫기"
          >
            {"\u2715"}
          </button>
        </div>

        {/* 매뉴얼 본문 영역 */}
        <div className="space-y-3.5 overflow-y-auto pr-1 text-xs leading-relaxed flex-1 min-h-0">
          {sections.map((section, idx) => (
            <div key={section.heading || idx} className="space-y-1.5">
              {section.heading && (
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1 bg-slate-100/80 px-2 py-1 rounded-md">
                  {section.heading}
                </h4>
              )}
              {section.items && (
                <ul className="space-y-2 pl-0.5">
                  {section.items.map((item, itemIdx) => {
                    const match = item.title ? item.title.match(/^(\d+\.)\s*(.*)$/) : null;
                    const numPrefix = match ? match[1] : null;
                    const rawTitle = match ? match[2] : item.title;
                    const cleanTitle = rawTitle ? rawTitle.replace(/^:\s*/, '').replace(/:\s*$/, '') : '';

                    return (
                      <li key={item.title || itemIdx} className="flex items-start gap-1.5 text-slate-600 leading-relaxed text-xs">
                        {item.iconName && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 shadow-xs shrink-0 mt-0.5">
                            <Icon name={item.iconName} size={12} className="text-slate-700 shrink-0" />
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-800">
                            {numPrefix && <span className="font-bold text-slate-800 mr-1">{numPrefix}</span>}
                            {cleanTitle}:{" "}
                          </span>
                          <span className="text-slate-600 font-medium">{item.desc}</span>
                          {item.subItems && (
                            <div className="pl-2 mt-1.5 space-y-1 text-[11px]">
                              {item.subItems.map((sub, sIdx) => (
                                <div key={sub.label || sIdx} className="flex items-center gap-1.5 text-slate-600 font-medium">
                                  {sub.isHelpPing ? (
                                    <span className="relative flex items-center justify-center shrink-0 w-4 h-4">
                                      <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" style={syncedPingStyle} />
                                      <span className="relative z-10 w-4 h-4 rounded-full bg-slate-200/60 text-slate-700 border border-slate-300/50 flex items-center justify-center font-black text-[10px]">?</span>
                                    </span>
                                  ) : (
                                    <span className="shrink-0">{sub.emoji}</span>
                                  )}
                                  <span>{sub.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {section.note && (
                <p className="mt-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 p-2 rounded-lg whitespace-pre-line border border-indigo-100">
                  {section.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}
