import { useI18n } from "../lib/i18n.jsx";
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalLock } from '../hooks/useModalLock.js';
import Marking2DLayoutRenderer from './ui/Marking2DLayoutRenderer.jsx';

export default function MidlineResultModal({
  // i18n

  isOpen,
  onConfirm,
  onChangeMarkingType,
  midlineResult,
  sharedState = {},
  denomMode,
  setDenomMode,
  isOvalMissingNotice = false,
}) {
  // 🔒 결과 모달 오픈 시 배경 스크롤 차단 & 화면 꺼짐 방지 자동 적용
  useModalLock(isOpen);
  const { t } = useI18n();

  // 📐 2D 마킹 가이드 시뮬레이터 도면 모달 오픈 상태
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  if (!isOpen) return null;

  const {
    dNTHalfFormatted,
    dMTFormatted,
    dRTFormatted,
    dCenterlineMidFormatted,
    dMRFormatted,
    dCenterlineMidCCFormatted,
    dMRCCFormatted,
    markingType = 'Center to Center',
  } = midlineResult || {};

  const isCutToCutMode = markingType !== 'Center to Center';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 py-4 sm:py-6 select-none animate-fade-in overflow-y-auto overscroll-contain"
    >
      <div className="w-full max-w-[560px] bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-6 shadow-2xl flex flex-col justify-between gap-3.5 sm:gap-4 my-auto mb-10 sm:my-auto max-h-none sm:max-h-[92vh] sm:max-h-[92dvh]">
        {/* 📌 모달 상단 헤더: [ Cut to Cut ] [ Center to Center ] 2단 세그먼트 버튼 탭 & [ 16분 | 32분 | .5/16분 ] 3-Way 분수 토글 */}
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeMarkingType && onChangeMarkingType('Cut to Cut')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                markingType === 'Cut to Cut'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              Cut to Cut
            </button>
            <button
              type="button"
              onClick={() => onChangeMarkingType && onChangeMarkingType('Center to Center')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
                markingType === 'Center to Center'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-bold'
              }`}
            >
              Center to Center
            </button>
          </div>

          {/* 16분 | 32분 | .5/16분 라디오 버튼 그룹 (슬레이트 계열) */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none">
              <input
                type="radio"
                name="midlineDenomMode"
                value="16"
                checked={denomMode === 16 || denomMode === '16'}
                onChange={() => setDenomMode && setDenomMode(16)}
                className="text-slate-700 accent-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t('denom16')}</span>
            </label>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none">
              <input
                type="radio"
                name="midlineDenomMode"
                value="32"
                checked={denomMode === 32 || denomMode === '32'}
                onChange={() => setDenomMode && setDenomMode(32)}
                className="text-slate-700 accent-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t('denom32')}</span>
            </label>
            <label className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none">
              <input
                type="radio"
                name="midlineDenomMode"
                value="half16"
                checked={denomMode === 'half16'}
                onChange={() => setDenomMode && setDenomMode('half16')}
                className="text-slate-700 accent-slate-700 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span>{t('denomHalf16')}</span>
            </label>
          </div>
        </div>

        {/* 📌 Actual Span 연계 미드라인 마킹 연산 시 오발 수치 2개 모두 누락된 경우 안내 문구 */}
        {isOvalMissingNotice && (
          <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs sm:text-sm font-bold text-center shrink-0">
            {t('ovalMissingNotice')}
          </div>
        )}

        {/* 📌 마킹 수치 통합 외곽 박스 (높이 완전 일원화) */}
        <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-3 sm:p-5 shadow-2xs flex flex-col gap-3 sm:gap-3.5 flex-1 justify-between">
          {/* 1. {isCutToCutMode ? t('midlineToThumb') : t('midlineToThumbCC')} */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-black px-1">
              {isCutToCutMode ? t('midlineToThumb') : t('midlineToThumbCC')}
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[26px] sm:text-[35px] font-extrabold text-black font-sans tracking-[0.05em] sm:tracking-[0.1em]">
                {dNTHalfFormatted || '-'}
              </span>
            </div>
          </div>

          {/* 2. {isCutToCutMode ? t('thumbToMiddle') : t('thumbToMiddleCC')} */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-black px-1">
              {isCutToCutMode ? t('thumbToMiddle') : t('thumbToMiddleCC')}
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[26px] sm:text-[35px] font-extrabold text-black font-sans tracking-[0.05em] sm:tracking-[0.1em]">
                {dMTFormatted || '-'}
              </span>
            </div>
          </div>

          {/* 3. {isCutToCutMode ? t('thumbToRing') : t('thumbToRingCC')} */}
          <div className="flex flex-col gap-1">
            <span className="text-sm sm:text-base font-black text-black px-1">
              {isCutToCutMode ? t('thumbToRing') : t('thumbToRingCC')}
            </span>
            <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
              <span className="text-[26px] sm:text-[35px] font-extrabold text-black font-sans tracking-[0.05em] sm:tracking-[0.1em]">
                {dRTFormatted || '-'}
              </span>
            </div>
          </div>

          {/* 📌 마킹 방식별 조건부 레이아웃 분기 (완전 일치 2단 높이) */}
          <div className="flex flex-col gap-3 sm:gap-3.5 min-h-[160px] sm:min-h-[180px] justify-between">
            {isCutToCutMode ? (
              <div key="cutToCut" className="flex flex-col gap-3 sm:gap-3.5 animate-fade-in flex-1 justify-between">
                {/* 4 & 5: Cut to Cut 기준 2단 배치 ({t('centerlineToMiddle')} | {t('middleToRing')}) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs sm:text-sm md:text-base font-black text-black px-0.5 sm:px-1 truncate">
                      {t('centerlineToMiddle')}
                    </span>
                    <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                      <span className="text-[20px] xs:text-[24px] sm:text-[32px] font-extrabold text-black font-sans tracking-tight sm:tracking-[0.05em]">
                        {dCenterlineMidFormatted || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs sm:text-sm md:text-base font-black text-black px-0.5 sm:px-1 truncate">
                      {t('middleToRing')}
                    </span>
                    <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                      <span className="text-[20px] xs:text-[24px] sm:text-[32px] font-extrabold text-black font-sans tracking-tight sm:tracking-[0.05em]">
                        {dMRFormatted || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6 & 7: Center to Center 기준 2단 배치 추가 (구분선 없이 자연스러운 통합 2단) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs sm:text-sm md:text-base font-black text-black px-0.5 sm:px-1 truncate">
                      {t('midlineToMiddleCenter')}
                    </span>
                    <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex items-center justify-center text-center">
                      <span className="text-[20px] xs:text-[24px] sm:text-[32px] font-extrabold text-black font-sans tracking-tight sm:tracking-[0.05em]">
                        {dCenterlineMidCCFormatted || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs sm:text-sm md:text-base font-black text-black px-0.5 sm:px-1 truncate">
                      {t('middleCenterToRingCenter')}
                    </span>
                    <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-indigo-200/80 shadow-2xs flex items-center justify-center text-center">
                      <span className="text-[20px] xs:text-[24px] sm:text-[32px] font-extrabold text-black font-sans tracking-tight sm:tracking-[0.05em]">
                        {dMRCCFormatted || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key="centerToCenter" className="flex flex-col gap-3 sm:gap-3.5 animate-fade-in flex-1 justify-between">
                {/* 📌 Center to Center 마킹 방식 시 1열 세로 기존 방식 100% 동일 유지 */}
                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm md:text-base font-black text-black px-1">
                    {t('centerlineToMiddleCC')}
                  </span>
                  <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                    <span className="text-[26px] sm:text-[35px] font-extrabold text-black font-sans tracking-[0.1em]">
                      {dCenterlineMidFormatted || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-xs sm:text-sm md:text-base font-black text-black px-1">
                    {t('middleToRingCC')}
                  </span>
                  <div className="h-14 sm:h-16 w-full bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center text-center">
                    <span className="text-[26px] sm:text-[35px] font-extrabold text-black font-sans tracking-[0.1em]">
                      {dMRFormatted || '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 모달 하단 2단 버튼: [ 시뮬레이터 (도면) | 확인 ] */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className="h-12 w-full bg-slate-800 border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-slate-900 rounded-md text-sm sm:text-base font-black active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>시뮬레이터</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 w-full bg-slate-800 text-white rounded-md text-sm sm:text-base font-black hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center shadow-2xs"
          >
            {t('confirmBtn')}
          </button>
        </div>
      </div>

      {/* 📐 2D 마킹 가이드 도면 시뮬레이터 풀스크린 모달 */}
      {isSimulatorOpen && (
        <Marking2DLayoutRenderer
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          midlineResult={midlineResult}
          sharedState={sharedState}
          onChangeMarkingType={onChangeMarkingType}
        />
      )}
    </div>,
    document.body
  );
}
