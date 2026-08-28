import { useI18n } from "../lib/i18n.jsx";
import React from 'react';
import { createPortal } from 'react-dom';
import { useModalLock } from '../hooks/useModalLock.js';

export default function SpanResultModal({
  isOpen,
  onConfirm,
  fromType,
  toType,
  midConverted,
  ringConverted,
  denomMode,
  setDenomMode,
  isOvalMissingNotice = false,
}) {
  // 🔒 결과 모달 오픈 시 배경 스크롤 차단 & 화면 꺼짐 방지 자동 적용
  useModalLock(isOpen);
  const { t } = useI18n();

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 py-4 sm:py-6 select-none animate-fade-in overflow-y-auto overscroll-contain"
    >
      <div className="w-full max-w-[560px] bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col justify-between gap-3.5 sm:gap-4 my-auto mb-10 sm:my-auto max-h-none sm:max-h-[92vh] sm:max-h-[92dvh]">
        {/* 모달 상단 헤더 (산세리프 font-sans 현대적 서체 적용 & 16분 / 32분 / .5/16 3-Way 분수 토글) */}
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-base sm:text-lg font-black text-slate-900 font-sans tracking-tight leading-tight">
            {fromType} ➔ {toType}
          </h2>

          {/* 16분 | 32분 | .5/16분 라디오 버튼 그룹 (슬레이트 계열) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none">
              <input
                type="radio"
                name="spanDenomMode"
                value="16"
                checked={denomMode === 16 || denomMode === '16'}
                onChange={() => setDenomMode(16)}
                className="text-slate-700 accent-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t('denom16')}</span>
            </label>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none">
              <input
                type="radio"
                name="spanDenomMode"
                value="32"
                checked={denomMode === 32 || denomMode === '32'}
                onChange={() => setDenomMode(32)}
                className="text-slate-700 accent-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t('denom32')}</span>
            </label>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none">
              <input
                type="radio"
                name="spanDenomMode"
                value="half16"
                checked={denomMode === 'half16'}
                onChange={() => setDenomMode('half16')}
                className="text-slate-700 accent-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t('denomHalf16')}</span>
            </label>
          </div>
        </div>

        {/* 📌 Actual Span 연계 변환 시 오발 수치 2개 모두 누락된 경우 안내 문구 */}
        {isOvalMissingNotice && (
          <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs sm:text-sm font-bold text-center">
            {t('ovalMissingNotice')}
          </div>
        )}

        {/* 📌 스판 변환 수치 통합 외곽 박스 (+0.1em tracking-[0.1em] 최상위 자간 & '중지 스판' / '약지 스판' 간결 라벨 적용) */}
        <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-3 sm:p-5 shadow-2xs flex flex-col gap-3 sm:gap-3.5">
          {/* 1. 중지 스판 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-indigo-950 px-1">
              {t('middleSpan')}
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[26px] sm:text-[35px] font-extrabold text-indigo-950 font-sans tracking-[0.05em] sm:tracking-[0.1em]">
                {midConverted || '-'}
              </span>
            </div>
          </div>

          {/* 2. 약지 스판 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-indigo-950 px-1">
              {t('ringSpan')}
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[26px] sm:text-[35px] font-extrabold text-indigo-950 font-sans tracking-[0.05em] sm:tracking-[0.1em]">
                {ringConverted || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 📌 모달 하단 버튼: [확인 (다크 슬레이트)] */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 w-full bg-slate-800 text-white rounded-md text-sm sm:text-base font-black hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center shadow-2xs"
          >
            {t('confirmBtn')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
