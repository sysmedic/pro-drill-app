import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import SelectField from './ui/SelectField.jsx';
import KeypadField from './ui/KeypadField.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import { parseSpanFraction, formatFractionByDenom } from '../lib/spanConverter.js';
import {
  HOLE_OPTIONS,
  PITCH_OPTIONS,
  getDynamicOvalOptions,
  getOvalCutOptions,
} from '../lib/chartOptions.js';

const OvalResultModal = React.lazy(() => import('./OvalResultModal.jsx'));

const toFraction64 = (num) => formatFractionByDenom(num, 64);

const formatCalculatedValue = (num) => {
  if (isNaN(num)) return '-';
  if (Math.abs(num) < 0.0005) return '0.000';
  return num.toFixed(3);
};

function OvalCalculatorView({ sharedState, updateSharedState }) {
  const {
    holeSize,
    ovalSize,
    ovalCut,
    ovalCut1: rawOvalCut1,
    ovalCut2: rawOvalCut2,
    ovalCorrection,
    ovalAngle,
    latDir,
    latVal,
    vertDir,
    vertVal,
    isLeftHanded,
    isDetailedMode,
    autoOpenOvalMatrix,
  } = sharedState;

  // 📌 오발컷 1 및 오발컷 2 하위 호환 파싱
  const ovalCut1 = rawOvalCut1 || ovalCut;
  const ovalCut2 = rawOvalCut2 || ovalCut || ovalCut1;

  // 키패드 및 모달 상태 ('angle' | null)
  const [activeKeypad, setActiveKeypad] = useState(null);

  // 📌 오발 가공 결과 전면 모달 오픈 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 📌 [지공사님 핵심 지침 100% 반영]: 아카이브에서 로드 시 오발 피치 메트릭스 모달 즉시 다이렉트 오픈
  useEffect(() => {
    if (autoOpenOvalMatrix) {
      setIsModalOpen(true);
      updateSharedState('autoOpenOvalMatrix', false);
    }
  }, [autoOpenOvalMatrix, updateSharedState]);

  // 📌 [지공사님 핵심 지침 100% 반영]: 오발컷 계산기 입력값 전체 공란 초기화
  const handleClearAllInputs = useCallback(() => {
    updateSharedState({
      holeSize: '',
      ovalSize: '',
      ovalCut: '',
      ovalCut1: '',
      ovalCut2: '',
      ovalAngle: '',
      ovalCorrection: '0',
      latDir: '',
      latVal: '',
      vertDir: '',
      vertVal: '',
      extraBitCount: 0,
      bitCustomSizes: {},
      bitCustomOffsets: {},
    });
  }, [updateSharedState]);

  const handleStateChange = useCallback((keyOrObj, val) => {
    updateSharedState(keyOrObj, val);
  }, [updateSharedState]);

  // 원홀 수치 기준 오발 크기 (원홀 이상 20개 수치) 드롭다운 옵션 동적 생성
  const dynamicOvalOptions = useMemo(() => getDynamicOvalOptions(holeSize), [holeSize]);

  // 원홀 수치 기준 오발 컷 (원홀 포함 이하 감산 11개 수치) 드롭다운 옵션 동적 생성
  const ovalCutOptions = useMemo(() => getOvalCutOptions(holeSize), [holeSize]);

  // 초기 진입 시 및 미입력 상태 검증 (모든 항목 필수)
  const isHoleSizeMissing = !holeSize;
  const isOvalSizeMissing = !ovalSize;
  const isOvalCut1Missing = !ovalCut1;
  const isOvalCut2Missing = !ovalCut2;
  const isOvalAngleMissing = !ovalAngle;

  // 좌우 / 상하 피치 필수 입력 검증 (최소 한 쪽에 유효한 수치가 존재해야 함)
  const hasLatPitch = Boolean(latDir && latVal !== '');
  const hasVertPitch = Boolean(vertDir && vertVal !== '');

  const isLatPitchMissing = !hasLatPitch;
  const isVertPitchMissing = !hasVertPitch;

  // 계산 차단 조건 (필수 항목 및 피치 2대축 미입력 시 100% 차단)
  const isCalculationBlocked =
    isHoleSizeMissing ||
    isOvalSizeMissing ||
    isOvalCut1Missing ||
    isOvalCut2Missing ||
    isOvalAngleMissing ||
    isLatPitchMissing ||
    isVertPitchMissing;

  const baseHoleSizeNum = parseSpanFraction(holeSize);
  const ovalCutNum1 = parseSpanFraction(holeSize ? ovalCut1 : '');
  const ovalCutNum2 = parseSpanFraction(holeSize ? ovalCut2 : '');
  const oval = parseSpanFraction(holeSize ? ovalSize : '');
  const correction = parseSpanFraction(ovalCorrection);
  const angle = parseFloat(ovalAngle) || 0;
  const radians = (angle * Math.PI) / 180;
  const handMultiplier = isLeftHanded ? -1 : 1;

  const pitchDown = vertDir === 'reverse' && vertVal !== '' ? vertVal : '';
  const pitchUp = vertDir === 'forward' && vertVal !== '' ? vertVal : '';
  const pitchLeft = latDir === 'left' && latVal !== '' ? latVal : '';
  const pitchRight = latDir === 'right' && latVal !== '' ? latVal : '';

  const thumbVertical =
    (pitchDown ? parseSpanFraction(pitchDown) : 0) -
    (pitchUp ? parseSpanFraction(pitchUp) : 0);

  const thumbHorizontal =
    (pitchLeft ? parseSpanFraction(pitchLeft) : 0) -
    (pitchRight ? parseSpanFraction(pitchRight) : 0);

  // 📌 가공 이동 거리(L_max) 및 권장 정밀도 모드 실시간 산출
  const hNum = baseHoleSizeNum || 0.75;
  const oNum = oval || (hNum + 0.125);
  const c1Num = ovalCutNum1 || hNum;
  const c2Num = ovalCutNum2 || c1Num;

  const L1 = Math.max(0, (oNum - c1Num) / 2);
  const L2 = Math.max(0, (oNum - c2Num) / 2);
  const maxL = Math.max(L1, L2);

  // 1) L_max <= 0.0625" (1/16" 이하, 편차 1/8" 이하) -> basic (3드릴 기본 추천)
  // 2) 0.0625" < L_max <= 0.125" (1/8" 이하, 편차 1/4" 이하) -> detailed (5드릴 정밀 추천)
  // 3) L_max > 0.125" (1/8" 초과, 편차 1/4" 초과 롱 오발) -> ultra (7드릴 초정밀 추천)
  const recommendedMode = useMemo(() => {
    if (maxL <= 0.0625) return 'basic';
    if (maxL <= 0.125) return 'detailed';
    return 'ultra';
  }, [maxL]);

  // 📌 정밀도 3단계 모드 ('basic': 3, 'detailed': 5, 'ultra': 7)
  const precisionMode = sharedState?.precisionMode || (isDetailedMode ? 'detailed' : 'basic');
  const baseBitsCount = precisionMode === 'ultra' ? 7 : (precisionMode === 'detailed' ? 5 : 3);
  const extraCount = sharedState?.extraBitCount || 0;
  const totalActiveBits = Math.min(8, baseBitsCount + extraCount);

  // 📌 드릴 비트 규격 연산 (Row 1~8 동적 연산 지원 & 도면 커스텀 규격 반영)
  const getDrillBitValue = (rowIndex) => {
    if (!baseHoleSizeNum || !ovalCutNum1 || !ovalCutNum2) return '-';

    if (rowIndex > totalActiveBits) return '-';

    // 도면에서 커스텀 변경한 규격 수치가 있다면 1순위 적용
    const customSizes = sharedState?.bitCustomSizes || {};
    if (customSizes[rowIndex]) {
      return customSizes[rowIndex];
    }

    // 마스터 원홀 비트 (항상 totalActiveBits 행)
    if (rowIndex === totalActiveBits) {
      return toFraction64(baseHoleSizeNum);
    }

    if (rowIndex === 1) return toFraction64(ovalCutNum1);
    if (rowIndex === 2) return toFraction64(ovalCutNum2);

    if (precisionMode === 'ultra') {
      // 7드릴 초정밀 모드 (#3·#4 하단, #5·#6 상단)
      if (rowIndex === 3) return toFraction64(baseHoleSizeNum + (ovalCutNum2 - baseHoleSizeNum) * (2 / 3));
      if (rowIndex === 4) return toFraction64(baseHoleSizeNum + (ovalCutNum2 - baseHoleSizeNum) * (1 / 3));
      if (rowIndex === 5) return toFraction64(baseHoleSizeNum + (ovalCutNum1 - baseHoleSizeNum) * (1 / 3));
      if (rowIndex === 6) return toFraction64(baseHoleSizeNum + (ovalCutNum1 - baseHoleSizeNum) * (2 / 3));
      return toFraction64(ovalCutNum1);
    } else if (precisionMode === 'detailed') {
      // 5드릴 정밀 모드 (#3 하단, #4 상단)
      if (rowIndex === 3) return toFraction64((ovalCutNum2 + baseHoleSizeNum) / 2);
      if (rowIndex === 4) return toFraction64((ovalCutNum1 + baseHoleSizeNum) / 2);
      return toFraction64(ovalCutNum1);
    } else {
      // 3드릴 기본 모드
      return toFraction64(ovalCutNum1);
    }
  };

  // 📌 수평 피치 연산 (Row 1~8 동적 연산 & 도면 D-Pad 오프셋 1:1 합성 반영)
  const getHorizontalValue = (rowIndex) => {
    if (isCalculationBlocked || !oval || !ovalCutNum1 || !ovalCutNum2) return '-';

    if (rowIndex > totalActiveBits) return '-';

    const customOffsets = sharedState?.bitCustomOffsets || {};
    const customOffX = (customOffsets[rowIndex] && customOffsets[rowIndex].x) || 0;

    const calcValue1 = (((oval - ovalCutNum1) / 2) + correction) * Math.cos(radians) * handMultiplier;
    const calcValue2 = (((oval - ovalCutNum2) / 2) + correction) * Math.cos(radians) * handMultiplier;

    let baseH = 0;
    if (rowIndex === totalActiveBits) {
      baseH = thumbHorizontal;
    } else if (rowIndex === 1) {
      baseH = thumbHorizontal - calcValue1;
    } else if (rowIndex === 2) {
      baseH = thumbHorizontal + calcValue2;
    } else if (precisionMode === 'ultra') {
      if (rowIndex === 3) baseH = thumbHorizontal + calcValue2 * (2 / 3);
      else if (rowIndex === 4) baseH = thumbHorizontal + calcValue2 * (1 / 3);
      else if (rowIndex === 5) baseH = thumbHorizontal - calcValue1 * (1 / 3);
      else if (rowIndex === 6) baseH = thumbHorizontal - calcValue1 * (2 / 3);
      else baseH = thumbHorizontal;
    } else if (precisionMode === 'detailed') {
      if (rowIndex === 3) baseH = thumbHorizontal + (calcValue2 / 2);
      else if (rowIndex === 4) baseH = thumbHorizontal - (calcValue1 / 2);
      else baseH = thumbHorizontal;
    } else {
      baseH = thumbHorizontal;
    }

    return formatCalculatedValue(baseH + customOffX);
  };

  // 📌 수직 피치 연산 (Row 1~8 동적 연산 & 도면 D-Pad 오프셋 1:1 합성 반영)
  const getVerticalValue = (rowIndex) => {
    if (isCalculationBlocked || !oval || !ovalCutNum1 || !ovalCutNum2) return '-';

    if (rowIndex > totalActiveBits) return '-';

    const customOffsets = sharedState?.bitCustomOffsets || {};
    const customOffY = (customOffsets[rowIndex] && customOffsets[rowIndex].y) || 0;

    const calcValue1 = (((oval - ovalCutNum1) / 2) + correction) * Math.sin(radians);
    const calcValue2 = (((oval - ovalCutNum2) / 2) + correction) * Math.sin(radians);

    let baseV = 0;
    if (rowIndex === totalActiveBits) {
      baseV = thumbVertical;
    } else if (rowIndex === 1) {
      baseV = thumbVertical + calcValue1;
    } else if (rowIndex === 2) {
      baseV = thumbVertical - calcValue2;
    } else if (precisionMode === 'ultra') {
      if (rowIndex === 3) baseV = thumbVertical - calcValue2 * (2 / 3);
      else if (rowIndex === 4) baseV = thumbVertical - calcValue2 * (1 / 3);
      else if (rowIndex === 5) baseV = thumbVertical + calcValue1 * (1 / 3);
      else if (rowIndex === 6) baseV = thumbVertical + calcValue1 * (2 / 3);
      else baseV = thumbVertical;
    } else if (precisionMode === 'detailed') {
      if (rowIndex === 3) baseV = thumbVertical - (calcValue2 / 2);
      else if (rowIndex === 4) baseV = thumbVertical + (calcValue1 / 2);
      else baseV = thumbVertical;
    } else {
      baseV = thumbVertical;
    }

    return formatCalculatedValue(baseV + customOffY);
  };

  const handleCalculateClick = () => {
    if (!isCalculationBlocked) {
      // 📌 [지공사님 핵심 지침]: 오발컷 계산 클릭 시 입력내용 바탕으로 최적 드릴 모드를 무조건 1순위로 자동 세팅
      updateSharedState({
        precisionMode: recommendedMode,
        isDetailedMode: recommendedMode !== 'basic',
        extraBitCount: 0,
        bitCustomSizes: {},
        bitCustomOffsets: {},
        isNewCalculation: true,
      });
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 카드 1: 스냅샷 1번 오발 계산기 외곽 카운터 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 📌 상단 헤더: [엄지 제원] 타이틀 + [손방향 (왼손 | 오른손)] 토글 */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <h3 className="text-base font-extrabold text-slate-800 font-sans tracking-tight">
            엄지 제원
          </h3>

          {/* 오른쪽 우상단 손방향 토글 */}
          <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-md h-9 w-44 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => handleStateChange('isLeftHanded', true)}
              className={`flex-1 h-full text-xs font-extrabold rounded transition-all cursor-pointer flex items-center justify-center ${
                isLeftHanded
                  ? 'bg-slate-800 text-white shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              왼손
            </button>
            <button
              type="button"
              onClick={() => handleStateChange('isLeftHanded', false)}
              className={`flex-1 h-full text-xs font-extrabold rounded transition-all cursor-pointer flex items-center justify-center ${
                !isLeftHanded
                  ? 'bg-slate-800 text-white shadow-2xs font-black'
                  : 'text-slate-500 hover:text-slate-800 font-bold'
              }`}
            >
              오른손
            </button>
          </div>
        </div>

        {/* 📌 단일 회색 통합 외곽 박스 (엄지 피치 + 상세 제원) */}
        <div className="space-y-4 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          {/* 섹션 1: 엄지 피치 4개 필드 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 block">엄지 피치</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                density="compact"
                isRequiredMissing={isLatPitchMissing}
                label="Left (◄)"
                onChange={(v) => {
                  if (v !== '') handleStateChange({ latDir: 'left', latVal: v });
                  else handleStateChange({ latDir: '', latVal: '' });
                }}
                options={PITCH_OPTIONS}
                value={latDir === 'left' ? latVal : ''}
              />
              <SelectField
                density="compact"
                isRequiredMissing={isLatPitchMissing}
                label="Right (►)"
                onChange={(v) => {
                  if (v !== '') handleStateChange({ latDir: 'right', latVal: v });
                  else handleStateChange({ latDir: '', latVal: '' });
                }}
                options={PITCH_OPTIONS}
                value={latDir === 'right' ? latVal : ''}
              />
              <SelectField
                density="compact"
                isRequiredMissing={isVertPitchMissing}
                label="Reverse (▼)"
                onChange={(v) => {
                  if (v !== '') handleStateChange({ vertDir: 'reverse', vertVal: v });
                  else handleStateChange({ vertDir: '', vertVal: '' });
                }}
                options={PITCH_OPTIONS}
                value={vertDir === 'reverse' ? vertVal : ''}
              />
              <SelectField
                density="compact"
                isRequiredMissing={isVertPitchMissing}
                label="Forward (▲)"
                onChange={(v) => {
                  if (v !== '') handleStateChange({ vertDir: 'forward', vertVal: v });
                  else handleStateChange({ vertDir: '', vertVal: '' });
                }}
                options={PITCH_OPTIONS}
                value={vertDir === 'forward' ? vertVal : ''}
              />
            </div>
          </div>

          {/* 섹션 2: 상세 제원 (📌 feature/dual-oval-cut: 오발컷1 / 오발컷2 세분화 필드) */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <span className="text-xs font-bold text-slate-600 block">상세 제원</span>
            
            {/* 1단: 원홀 크기 & 오발 크기 (50:50 2단 그리드) */}
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                density="compact"
                isRequiredMissing={isHoleSizeMissing}
                label="원홀 (Hole Size)"
                onChange={(v) => {
                  handleStateChange({ holeSize: v, ovalSize: '', ovalCut1: '', ovalCut2: '', ovalCut: '' });
                }}
                options={HOLE_OPTIONS}
                placeholder=""
                value={holeSize}
              />

              <SelectField
                density="compact"
                disabled={!holeSize}
                isRequiredMissing={isOvalSizeMissing}
                label="오발 크기"
                onChange={(v) => handleStateChange({ ovalSize: v, ovalCut1: '', ovalCut2: '', ovalCut: '' })}
                options={dynamicOvalOptions}
                placeholder=""
                value={holeSize ? ovalSize : ''}
              />
            </div>

            {/* 2단: 오발컷 #1 (35%), 오발컷 #2 (35%), 오발 각도 (30%) 1단 3분할 배치 */}
            <div className="grid grid-cols-[35fr_35fr_30fr] gap-2 items-end">
              <SelectField
                density="compact"
                disabled={!holeSize || !ovalSize}
                isRequiredMissing={isOvalCut1Missing}
                label="오발컷 #1"
                onChange={(v) => {
                  handleStateChange({
                    ovalCut1: v,
                    ovalCut: v,
                    ovalCut2: v, // 📌 [지공사님 지침 100% 반영]: #1 선택 시 #2 자동 동기화 (이후 #2 개별 수정 가능)
                  });
                }}
                options={ovalCutOptions}
                placeholder=""
                value={holeSize && ovalSize ? ovalCut1 : ''}
              />

              <SelectField
                density="compact"
                disabled={!holeSize || !ovalSize}
                isRequiredMissing={isOvalCut2Missing}
                label="오발컷 #2"
                onChange={(v) => handleStateChange('ovalCut2', v)}
                options={ovalCutOptions}
                placeholder=""
                value={holeSize && ovalSize ? ovalCut2 : ''}
              />

              <KeypadField
                density="compact"
                isRequiredMissing={isOvalAngleMissing}
                label="오발 각도"
                onOpen={() => setActiveKeypad('angle')}
                placeholder="각도 입력"
                value={ovalAngle ? `${ovalAngle}°` : ''}
              />
            </div>
          </div>
        </div>

        {/* 📌 하단 전폭 [오발컷 계산] 버튼 */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleCalculateClick}
            disabled={isCalculationBlocked}
            className="h-11 w-full bg-slate-800 text-white rounded-lg text-sm sm:text-base font-black shadow-2xs hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            오발컷 계산
          </button>
        </div>
      </div>

      {/* 키패드 모달 연동 */}
      {activeKeypad === 'angle' && (
        <FractionKeypad
          initialValue={ovalAngle}
          isOpen={true}
          mode="number"
          onClose={() => setActiveKeypad(null)}
          onConfirm={(val) => {
            handleStateChange('ovalAngle', val);
            setActiveKeypad(null);
          }}
          title="오발 각도 입력"
        />
      )}

      {/* 📌 전면 결과 모달 (3D 시각화 파라미터 1:1 바인딩 - 지연 로딩) */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <OvalResultModal
            getDrillBitValue={getDrillBitValue}
            getHorizontalValue={getHorizontalValue}
            getVerticalValue={getVerticalValue}
            isCalculationBlocked={isCalculationBlocked}
            isDetailedMode={isDetailedMode}
            precisionMode={precisionMode}
            setPrecisionMode={(mode) => {
              if (updateSharedState) {
                updateSharedState({
                  precisionMode: mode,
                  isDetailedMode: mode !== 'basic',
                });
              }
            }}
            isOpen={isModalOpen}
            onConfirm={() => setIsModalOpen(false)}
            ovalCorrection={ovalCorrection}
            setIsDetailedMode={(mode) => {
              if (updateSharedState) {
                updateSharedState({
                  isDetailedMode: mode,
                  precisionMode: mode ? 'detailed' : 'basic',
                });
              }
            }}
            setOvalCorrection={(v) => updateSharedState('ovalCorrection', v)}
            holeSize={holeSize}
            ovalSize={ovalSize}
            ovalCut={ovalCut1}
            ovalCut1={ovalCut1}
            ovalCut2={ovalCut2}
            ovalAngle={ovalAngle}
            isLeftHanded={isLeftHanded}
            sharedState={sharedState}
            updateSharedState={updateSharedState}
          />
        </Suspense>
      )}
    </div>
  );
}

export default React.memo(OvalCalculatorView);
