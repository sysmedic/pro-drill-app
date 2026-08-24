import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SelectField from './ui/SelectField.jsx';
import Midline2DLayoutRenderer from './ui/Midline2DLayoutRenderer.jsx';
import { useModalLock } from '../hooks/useModalLock.js';

const OVAL_CORRECTION_OPTIONS = [
  { value: '0', label: '보정' },
  { value: '1/128', label: '보정 1/128' },
  { value: '1/64', label: '보정 1/64' },
  { value: '3/128', label: '보정 3/128' },
  { value: '1/32', label: '보정 1/32' },
];

export default function OvalResultModal({
  isOpen,
  onConfirm,
  isDetailedMode,
  setIsDetailedMode,
  precisionMode,
  setPrecisionMode,
  ovalCorrection,
  setOvalCorrection,
  getDrillBitValue,
  getHorizontalValue,
  getVerticalValue,
  holeSize,
  ovalSize,
  ovalCut,
  ovalCut1,
  ovalCut2,
  ovalAngle,
  isLeftHanded,
  sharedState,
  updateSharedState,
}) {
  // 🔒 결과 모달 오픈 시 배경 스크롤 차단 & 화면 꺼짐 방지 자동 적용
  useModalLock(isOpen);

  // 📌 풀스크린 시뮬레이터 직통 열림 상태
  const [isFullScreen2DOpen, setIsFullScreen2DOpen] = useState(false);

  // 📌 [차트 최초 입력 제원 스냅샷 보존]: 오발컷 계산 당시의 원홀, 오발, #1, #2 최초 수치 보존
  const initialSnapshotRef = useRef({
    holeSize,
    ovalSize,
    ovalCut,
    ovalCut1,
    ovalCut2,
  });

  useEffect(() => {
    if (!initialSnapshotRef.current.holeSize && holeSize) {
      initialSnapshotRef.current = {
        holeSize,
        ovalSize,
        ovalCut,
        ovalCut1,
        ovalCut2,
      };
    }
  }, [holeSize, ovalSize, ovalCut, ovalCut1, ovalCut2]);

  // 📌 매트릭스 리셋 안전 확인 모달 오픈 상태
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);

  const currentPrecision = precisionMode || (sharedState?.precisionMode) || (isDetailedMode ? 'detailed' : 'basic');

  const handlePrecisionChange = (mode) => {
    if (setPrecisionMode) {
      setPrecisionMode(mode);
    } else if (setIsDetailedMode) {
      setIsDetailedMode(mode !== 'basic');
    }
    if (updateSharedState) {
      updateSharedState({
        precisionMode: mode,
        isDetailedMode: mode !== 'basic',
      });
    }
  };

  // 📌 [지공사님 핵심 지침 100% 반영]: 차트 입력 최초 제원 및 기본(3드릴) 모드 완벽 리셋
  const handleConfirmReset = () => {
    setIsResetConfirmModalOpen(false);
    handlePrecisionChange('basic');

    const initH = initialSnapshotRef.current.holeSize || holeSize;
    const initO = initialSnapshotRef.current.ovalSize || ovalSize;
    const initC1 = initialSnapshotRef.current.ovalCut1 || ovalCut1;
    const initC2 = initialSnapshotRef.current.ovalCut2 || ovalCut2;
    const initC = initialSnapshotRef.current.ovalCut || ovalCut;

    if (updateSharedState) {
      updateSharedState({
        holeSize: initH,
        ovalSize: initO,
        ovalCut1: initC1,
        ovalCut2: initC2,
        ovalCut: initC,
        precisionMode: 'basic',
        isDetailedMode: false,
        extraBitCount: 0,
        bitCustomSizes: {},
        bitCustomOffsets: {},
      });
    }
  };

  if (!isOpen) return null;

  // 2D 블루프린트 렌더러용 오프셋 데이터 구조화
  const rowResults = Array.from({ length: 8 }).map((_, idx) => {
    const rowIdx = idx + 1;
    const hVal = parseFloat(getHorizontalValue(rowIdx)) || 0;
    const vVal = parseFloat(getVerticalValue(rowIdx)) || 0;
    return {
      row: rowIdx,
      horizShift: hVal,
      vertShift: vVal,
    };
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fade-in"
    >
      {/* 📌 [지공사님 핵심 지침]: 기본(3)/정밀(5)/초정밀(7) 3단계 모드 & 최대 8드릴 확장 구조 */}
      <div className="w-full max-w-[540px] bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between gap-4 max-h-[95vh] overflow-y-auto">
        {/* 모달 상단 헤더 & 풀스크린 시뮬레이터 직통 전환 버튼 */}
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-slate-900 font-sans tracking-tight leading-tight">
            OVAL PITCH MATRIX
          </h2>
          <div className="flex items-center space-x-2">
            {/* 🔴 리셋 버튼 (시뮬레이터 버튼과 동일한 컨셉, 좌측 배치) */}
            <button
              type="button"
              onClick={() => setIsResetConfirmModalOpen(true)}
              className="h-10 px-3.5 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950/90 text-rose-300 hover:text-white hover:from-slate-800 hover:to-rose-900 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              title="원홀, #1·#2 비트 수치 및 기본(3드릴) 모드로 복원"
            >
              <span>리셋</span>
            </button>

            {/* 🔵 시뮬레이터 버튼 (우측 배치) */}
            <button
              type="button"
              onClick={() => setIsFullScreen2DOpen(true)}
              className="h-10 px-4 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950/90 text-cyan-300 hover:text-white hover:from-slate-800 hover:to-cyan-900 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              title="중간 단계 없이 풀스크린 시뮬레이터로 즉시 전환"
            >
              <span>시뮬레이터</span>
            </button>
          </div>
        </div>

        {/* 📌 [지공사님 핵심 지침 100% 반영: 정밀도 3단계 7 : 보정 3 비율 배치] */}
        <div className="grid grid-cols-10 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 items-end">
          <div className="col-span-7 flex flex-col w-full">
            <label className="text-xs font-bold text-slate-600 mb-1">정밀도</label>
            <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-md h-10 w-full shadow-2xs">
              {(() => {
                const hasExtraBits = (sharedState?.extraBitCount || 0) > 0;
                return (
                  <>
                    <button
                      type="button"
                      disabled={hasExtraBits}
                      onClick={() => handlePrecisionChange('basic')}
                      className={`flex-1 h-full text-[11px] sm:text-xs font-extrabold rounded transition-all flex items-center justify-center ${
                        hasExtraBits
                          ? 'opacity-40 cursor-not-allowed text-slate-400'
                          : 'cursor-pointer'
                      } ${
                        currentPrecision === 'basic'
                          ? 'bg-slate-800 text-white shadow-2xs font-black'
                          : 'text-slate-500 hover:text-slate-800 font-bold'
                      }`}
                      title={hasExtraBits ? '드릴 비트가 추가된 상태에서는 리셋 후 모드 전환이 가능합니다' : '기본 (3드릴) 모드'}
                    >
                      기본
                    </button>
                    <button
                      type="button"
                      disabled={hasExtraBits}
                      onClick={() => handlePrecisionChange('detailed')}
                      className={`flex-1 h-full text-[11px] sm:text-xs font-extrabold rounded transition-all flex items-center justify-center ${
                        hasExtraBits
                          ? 'opacity-40 cursor-not-allowed text-slate-400'
                          : 'cursor-pointer'
                      } ${
                        currentPrecision === 'detailed'
                          ? 'bg-slate-800 text-white shadow-2xs font-black'
                          : 'text-slate-500 hover:text-slate-800 font-bold'
                      }`}
                      title={hasExtraBits ? '드릴 비트가 추가된 상태에서는 리셋 후 모드 전환이 가능합니다' : '정밀 (5드릴) 모드'}
                    >
                      정밀
                    </button>
                    <button
                      type="button"
                      disabled={hasExtraBits}
                      onClick={() => handlePrecisionChange('ultra')}
                      className={`flex-1 h-full text-[11px] sm:text-xs font-extrabold rounded transition-all flex items-center justify-center ${
                        hasExtraBits
                          ? 'opacity-40 cursor-not-allowed text-slate-400'
                          : 'cursor-pointer'
                      } ${
                        currentPrecision === 'ultra'
                          ? 'bg-slate-800 text-white shadow-2xs font-black'
                          : 'text-slate-500 hover:text-slate-800 font-bold'
                      }`}
                      title={hasExtraBits ? '드릴 비트가 추가된 상태에서는 리셋 후 모드 전환이 가능합니다' : '초정밀 (7드릴) 모드'}
                    >
                      초정밀
                    </button>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="col-span-3 flex flex-col justify-end">
            <SelectField
              density="compact"
              onChange={(v) => setOvalCorrection(v)}
              options={OVAL_CORRECTION_OPTIONS}
              value={ovalCorrection}
              controlClassName="text-center font-bold [text-align-last:center]"
              style={{ textAlign: 'center', textAlignLast: 'center' }}
            />
          </div>
        </div>

        {/* 📌 피치 매트릭스 수치표 (4:3:3 비율 [grid-cols-10] & 최대 #8 비트 확장 지원) */}
        <div className="flex flex-col gap-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="grid grid-cols-10 text-xs font-bold bg-slate-100 border-b border-slate-200 text-slate-600">
              <div className="col-span-4 py-2.5 px-2 text-center border-r border-slate-200">드릴 비트</div>
              <div className="col-span-3 py-2.5 px-2 text-center border-r border-slate-200">수평 피치</div>
              <div className="col-span-3 py-2.5 px-2 text-center">수직 피치</div>
            </div>

            {/* 총 8개 비트 로우 셀 증설 매핑 (1 ~ 8) */}
            {Array.from({ length: 9 }).map((_, rowIndex) => {
              if (rowIndex === 0) return null;

              const baseBitsCount = currentPrecision === 'ultra' ? 7 : (currentPrecision === 'detailed' ? 5 : 3);
              const extraCount = sharedState?.extraBitCount || 0;
              const totalActiveBits = Math.min(8, baseBitsCount + extraCount);

              const isRowDisabled = rowIndex > totalActiveBits;
              const targetBitIndex = rowIndex;
              const isHoleBit = targetBitIndex === totalActiveBits;

              const horizValStr = isRowDisabled ? '-' : getHorizontalValue(targetBitIndex);
              const vertValStr = isRowDisabled ? '-' : getVerticalValue(targetBitIndex);
              const drillBitStr = isRowDisabled ? '-' : getDrillBitValue(targetBitIndex);

              const horizNum = parseFloat(horizValStr);
              const vertNum = parseFloat(vertValStr);

              const isHorizRed = !isRowDisabled && !isNaN(horizNum) && horizNum < 0;
              const isVertRed = !isRowDisabled && !isNaN(vertNum) && vertNum < 0;

              return (
                <div
                  key={rowIndex}
                  className={`grid grid-cols-10 text-xl sm:text-2xl font-black border-b border-slate-200 transition-colors ${
                    isRowDisabled ? 'bg-slate-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* 📌 드릴 비트 열 [col-span-4] */}
                  <div
                    className={`col-span-4 py-3 px-3.5 border-r border-slate-200 font-sans flex items-center justify-between tracking-[0.05em] ${
                      isRowDisabled ? 'text-slate-400/30 font-bold' : isHoleBit ? 'text-slate-900 font-black' : 'text-indigo-700 font-black'
                    }`}
                  >
                    {!isRowDisabled && drillBitStr !== '-' ? (
                      <>
                        <span className="text-sm sm:text-base font-black select-none shrink-0 text-slate-900">
                          #{targetBitIndex}
                        </span>
                        <span className={`flex-1 text-center font-black ${isHoleBit ? 'text-slate-900' : 'text-indigo-700'}`}>{drillBitStr}</span>
                      </>
                    ) : (
                      <span className="w-full text-center">{drillBitStr}</span>
                    )}
                  </div>

                  {/* 📌 수평 피치 열 [col-span-3] */}
                  <div
                    className={`col-span-3 py-3 px-2 text-center border-r border-slate-200 font-sans flex items-center justify-center tracking-[0.05em] ${
                      isRowDisabled
                        ? 'text-slate-400/30 font-bold'
                        : isHorizRed
                        ? 'text-rose-600 font-black'
                        : 'text-slate-900 font-black'
                    }`}
                  >
                    {horizValStr}
                  </div>

                  {/* 📌 수직 피치 열 [col-span-3] */}
                  <div
                    className={`col-span-3 py-3 px-2 text-center font-sans flex items-center justify-center tracking-[0.05em] ${
                      isRowDisabled
                        ? 'text-slate-400/30 font-bold'
                        : isVertRed
                        ? 'text-rose-600 font-black'
                        : 'text-slate-900 font-black'
                    }`}
                  >
                    {vertValStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 📌 [2D 지공도면 풀스크린 시뮬레이터 포털]: 피치 매트릭스 내부 인라인 도면 100% 소거 및 풀스크린 직통 연동 */}
        <Midline2DLayoutRenderer
          holeSize={holeSize}
          ovalSize={ovalSize}
          ovalCut={ovalCut}
          ovalCut1={ovalCut1}
          ovalCut2={ovalCut2}
          ovalAngle={ovalAngle}
          ovalCorrection={ovalCorrection}
          hand={isLeftHanded ? 'left' : 'right'}
          results={rowResults}
          getDrillBitValue={getDrillBitValue}
          isDetailedMode={isDetailedMode}
          onDetailedModeChange={(isDetailed) => setIsDetailedMode(isDetailed)}
          onlyFullScreenPortal={true}
          forceFullScreenOpen={isFullScreen2DOpen}
          onCloseFullScreen={() => setIsFullScreen2DOpen(false)}
          updateSharedState={updateSharedState}
          sharedState={sharedState}
        />

        {/* 하단 닫기/확인 버튼 */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center"
          >
            확인
          </button>
        </div>

        {/* ⚠️ 매트릭스 리셋 확인 인앱 팝업 모달 */}
        {isResetConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in select-none">
            <div className="bg-slate-900 border border-slate-700/90 rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 text-xl font-black">
                ⚠️
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-white">오발 매트릭스 리셋</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  원홀, #1·#2 비트 수치 및 모든 이동/추가 내역이 취소되고, 차트 최초 입력 당시의 기본(3드릴) 상태로 복원됩니다. 정말 초기화하시겠습니까?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmModalOpen(false)}
                  className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-950/50 transition-all cursor-pointer active:scale-95"
                >
                  리셋
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
