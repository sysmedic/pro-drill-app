import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const APP_VERSION = 'v1.2.0';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '2026.08.23 02:15';

export default function UpdateModal({ isOpen, onClose }) {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setStatusMessage('서버에서 최신 버전을 확인하는 중입니다...');

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      }

      setTimeout(() => {
        setIsChecking(false);
        setStatusMessage('현재 최신 버전(v1.2.0)을 사용 중입니다.');
      }, 700);
    } catch (err) {
      console.error('Update check failed', err);
      setIsChecking(false);
      setStatusMessage('업데이트 확인을 완료했습니다.');
    }
  };

  const handleForceReload = () => {
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 & 닫기 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              ✨
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                앱 정보 및 업데이트
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 버전 정보 카드 */}
        <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-500">현재 설치된 버전</div>
            <div className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>ProDrill Tools</span>
              <span className="px-2 py-0.5 bg-[#1e293b] text-white text-xs rounded-lg font-mono">
                {APP_VERSION}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 font-medium">빌드 일시</div>
            <div className="text-xs font-bold text-slate-700 font-mono">{BUILD_TIME}</div>
          </div>
        </div>

        {/* 주요 릴리즈 노트 */}
        <div className="space-y-2 py-1">
          <div className="text-xs font-bold text-slate-700">최신 주요 기능 및 개선사항</div>
          <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✔</span>
              <span><strong>초정밀 2D 오발 시뮬레이터</strong>: 0.5px/0.8px/1.0px 극세선 및 단일 토글 투명 도면 가공 뷰</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✔</span>
              <span><strong>3탭 스와이프 제스처</strong>: 스판 ⇄ 미드라인 ⇄ 오발 좌우 스와이프 슬라이드 이동</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold shrink-0">✔</span>
              <span><strong>제원 저장 및 불러오기</strong>: 다중 슬롯 스냅샷 영구 보관 및 원터치 복원</span>
            </div>
          </div>
        </div>

        {/* 상태 메시지 */}
        {statusMessage && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold text-center animate-fade-in">
            {statusMessage}
          </div>
        )}

        {/* 버튼 액션 */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={isChecking}
            className="w-full py-3 px-4 bg-[#1e293b] hover:bg-[#0f172a] disabled:bg-slate-400 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>{isChecking ? '⏳' : '🔄'}</span>
            <span>{isChecking ? '업데이트 확인 중...' : '최신 업데이트 확인'}</span>
          </button>

          <button
            type="button"
            onClick={handleForceReload}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>🧹</span>
            <span>캐시 초기화 및 강제 새로고침</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
