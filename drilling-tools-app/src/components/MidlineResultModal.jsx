import React from 'react';
import { createPortal } from 'react-dom';
import { useModalLock } from '../hooks/useModalLock.js';

export default function MidlineResultModal({
  isOpen,
  onConfirm,
  midlineResult,
  denomMode,
  setDenomMode,
  isOvalMissingNotice = false,
}) {
  // 🔒 결과 모달 오픈 시 배경 스크롤 차단 & 화면 꺼짐 방지 자동 적용
  useModalLock(isOpen);

  if (!isOpen) return null;

  const {
    dNTHalfFormatted,
    dMTFormatted,
    dRTFormatted,
    dCenterlineMidFormatted,
    dMRFormatted,
    dCenterlineMidCCFormatted,
    dMRCCFormatted,
    markingType,
  } = midlineResult || {};

  const isCutToCutMode = markingType !== 'Center to Center';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fade-in"
    >
      <div className="w-full max-w-[540px] bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between gap-4 max-h-[95vh] overflow-y-auto">
        {/* 모달 상단 헤더 (산세리프 font-sans 현대적 서체 적용 & 16분/32분 분수 토글) */}
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900 font-sans tracking-tight leading-tight">
            {markingType || 'Center to Center'}
          </h2>

          {/* 16분 | 32분 슬레이트 토글 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setDenomMode(16)}
              className={`px-3 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                denomMode === 16
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              16분
            </button>
            <button
              type="button"
              onClick={() => setDenomMode(32)}
              className={`px-3 py-1 text-xs font-black rounded-md transition-all cursor-pointer ${
                denomMode === 32
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              32분
            </button>
          </div>
        </div>

        {/* 📌 Actual Span 연계 미드라인 마킹 연산 시 오발 수치 2개 모두 누락된 경우 안내 문구 */}
        {isOvalMissingNotice && (
          <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-300/80 rounded-xl text-amber-900 text-xs sm:text-sm font-bold text-center">
            오발 지공 여부 확인해 주세요
          </div>
        )}

        {/* 📌 마킹 수치 통합 외곽 박스 (Cut to Cut 일 때 2단 & Center to Center 일 때 1열 세로 기존 방식) */}
        <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col gap-3.5">
          {/* 1. 미드라인 ↔ 엄지 마킹 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-indigo-950 px-1">
              미드라인 ↔ 엄지 마킹
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[29px] sm:text-[35px] font-extrabold text-indigo-950 font-sans tracking-[0.1em]">
                {dNTHalfFormatted || '-'}
              </span>
            </div>
          </div>

          {/* 2. 엄지 마킹 ↔ 중지 마킹 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-slate-700 px-1">
              엄지 마킹 ↔ 중지 마킹
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[29px] sm:text-[35px] font-extrabold text-slate-900 font-sans tracking-[0.1em]">
                {dMTFormatted || '-'}
              </span>
            </div>
          </div>

          {/* 3. 엄지 마킹 ↔ 약지 마킹 */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-slate-700 px-1">
              엄지 마킹 ↔ 약지 마킹
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[29px] sm:text-[35px] font-extrabold text-slate-900 font-sans tracking-[0.1em]">
                {dRTFormatted || '-'}
              </span>
            </div>
          </div>

          {/* 📌 마킹 방식별 조건부 레이아웃 분기 */}
          {isCutToCutMode ? (
            <>
              {/* 4 & 5: Cut to Cut 기준 2단 배치 (센터라인 ↔ 중지 마킹 | 중지 마킹 ↔ 약지 마킹) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-black text-indigo-900 px-1 truncate">
                    센터라인 ↔ 중지 마킹
                  </span>
                  <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                    <span className="text-[25px] sm:text-[31px] font-extrabold text-indigo-700 font-sans tracking-[0.08em]">
                      {dCenterlineMidFormatted || '-'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-black text-indigo-900 px-1 truncate">
                    중지 마킹 ↔ 약지 마킹
                  </span>
                  <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                    <span className="text-[25px] sm:text-[31px] font-extrabold text-indigo-700 font-sans tracking-[0.08em]">
                      {dMRFormatted || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6 & 7: Center to Center 기준 2단 배치 추가 (구분선 없이 자연스러운 통합 2단) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-black text-indigo-900 px-1 truncate">
                    미드라인 ↔ 중지 센터
                  </span>
                  <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex items-center justify-center text-center">
                    <span className="text-[25px] sm:text-[31px] font-extrabold text-indigo-800 font-sans tracking-[0.08em]">
                      {dCenterlineMidCCFormatted || '-'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm font-black text-indigo-900 px-1 truncate">
                    중지 센터 ↔ 약지 센터
                  </span>
                  <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex items-center justify-center text-center">
                    <span className="text-[25px] sm:text-[31px] font-extrabold text-indigo-800 font-sans tracking-[0.08em]">
                      {dMRCCFormatted || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 📌 Center to Center 마킹 방식 시 1열 세로 기존 방식 100% 동일 유지 */}
              <div className="flex flex-col gap-1">
                <span className="text-sm sm:text-base font-black text-indigo-900 px-1">
                  센터라인 ↔ 중지 마킹
                </span>
                <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                  <span className="text-[29px] sm:text-[35px] font-extrabold text-indigo-700 font-sans tracking-[0.1em]">
                    {dCenterlineMidFormatted || '-'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm sm:text-base font-black text-indigo-900 px-1">
                  중지 마킹 ↔ 약지 마킹
                </span>
                <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                  <span className="text-[29px] sm:text-[35px] font-extrabold text-indigo-700 font-sans tracking-[0.1em]">
                    {dMRFormatted || '-'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 모달 하단 단독 [확인] 버튼 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 w-full bg-slate-800 text-white rounded-md text-sm sm:text-base font-black hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center shadow-2xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
