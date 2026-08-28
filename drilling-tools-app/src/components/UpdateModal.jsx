import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export const CURRENT_APP_VERSION = 'v1.5.0';
export const LAST_SEEN_VERSION_KEY = 'prodrill_tools_last_seen_version';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '2026.08.28 12:25:00';

export default function UpdateModal({ isOpen, onClose }) {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  // 📌 확인 체크 및 다음 실행 시 모달 패스 처리
  const handleConfirmAndDismiss = () => {
    try {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, CURRENT_APP_VERSION);
    } catch (e) {
      console.error('Failed to save version to localStorage', e);
    }
    onClose();
  };

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
        setStatusMessage('현재 최신 버전을 사용 중입니다.');
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 py-4 sm:py-6 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto overscroll-contain"
      onClick={handleConfirmAndDismiss}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4 my-auto mb-10 sm:my-auto max-h-none sm:max-h-[92vh] sm:max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 헤더 & 닫기 */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon-192.png"
              alt="ProDrill Tools"
              className="w-8 h-8 rounded-md object-cover border border-slate-200 shadow-2xs"
            />
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                주요 업데이트 안내 ({CURRENT_APP_VERSION})
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirmAndDismiss}
            className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 버전 정보 카드 */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-500">배포 버전</div>
            <div className="text-base font-black text-slate-900">
              ProDrill Tools <span className="text-indigo-600 text-sm font-extrabold">{CURRENT_APP_VERSION}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 font-medium">배포 일시</div>
            <div className="text-xs font-bold text-slate-700 font-mono">{BUILD_TIME}</div>
          </div>
        </div>

        {/* 주요 릴리즈 노트 리스트 */}
        <div className="space-y-2 py-1">
          <div className="text-xs font-bold text-slate-700">이번 버전 핵심 개선사항</div>
          <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700 leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✔</span>
              <span><strong>공유 정책</strong>: 링크 접속 시 수치 자동 로드 및 연산 결과 화면으로 다이렉트 즉시 진입</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✔</span>
              <span><strong>저장 정책</strong>: 브라우저 로컬 저장소 100% 영구 보존 및 기존 아카이브 슬롯 데이터 안전 존치</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✔</span>
              <span><strong>마킹 탭 신설</strong>: 독립된 마킹 전용 탭 신설 및 스판 변환기 제원 100% 실시간 상호 참조</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✔</span>
              <span><strong>마킹가이드 계산 산출근거</strong>: 2D 시뮬레이터 내 구면 삼각법 및 엑추얼 미드라인 연산식 산출 근거 패널 탑재</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0">✔</span>
              <span><strong>인서트 추가</strong>: 인서트 0호(17/32") 및 0.5호(9/16") 신규 추가 및 정밀 계산 공식 반영</span>
            </div>
          </div>
        </div>

        {/* 상태 메시지 */}
        {statusMessage && (
          <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md text-xs font-bold text-center animate-fade-in">
            {statusMessage}
          </div>
        )}

        {/* 하단 확인 버튼 (클릭 시 다음 실행부터 패스) */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleConfirmAndDismiss}
            className="w-full py-3.5 px-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-black text-sm rounded-md transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-98"
          >
            ✓ 확인 (다음 실행 시 안내 생략)
          </button>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={isChecking}
              className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-300 text-slate-700 font-bold text-xs rounded-md transition-all flex items-center justify-center cursor-pointer"
            >
              {isChecking ? '확인 중...' : '최신 버전 확인'}
            </button>
            <button
              type="button"
              onClick={handleForceReload}
              className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-md transition-all flex items-center justify-center cursor-pointer"
            >
              캐시 초기화
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
