import React, { useState, useMemo, useCallback, Suspense } from 'react';
import KeypadField from './ui/KeypadField.jsx';
import SelectField from './ui/SelectField.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import { convertSpanValue } from '../lib/spanConverter.js';
import { calculateSphericalMidline } from '../lib/midlineCalculator.js';
import {
  SPAN_TYPE_OPTIONS,
  MID_HOLE_CUT_OPTIONS,
  RING_HOLE_CUT_OPTIONS,
  THUMB_HOLE_CUT_OPTIONS,
  FINGER_INSERT_OPTIONS,
  HOLE_OPTIONS,
  getDynamicOvalOptions,
} from '../lib/chartOptions.js';

const SpanResultModal = React.lazy(() => import('./SpanResultModal.jsx'));
const MidlineResultModal = React.lazy(() => import('./MidlineResultModal.jsx'));

function SpanConverterView({ sharedState, updateSharedState }) {
  const {
    midSpanStr,
    ringSpanStr,
    fromType,
    toType,
    denomMode,
    midHoleCut,
    midInsert,
    ringHoleCut,
    ringInsert,
    thumbHoleCut,
    holeSize,
    ovalSize,
    ovalCut,
    ovalAngle,
    isLeftHanded,
    bridgeStr = '3/16',
  } = sharedState;

  // 키패드 및 모달 상태 ('mid' | 'ring' | 'angle' | null)
  const [activeKeypad, setActiveKeypad] = useState(null);

  // 📌 결과 전면 모달 오픈 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 📌 마킹 가이드 모달 오픈 및 마킹 타입 ('Center to Center' | 'Cut to Cut') 상태
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [markingType, setMarkingType] = useState('Center to Center');

  const handleStateChange = useCallback((keyOrObj, val) => {
    updateSharedState(keyOrObj, val);
  }, [updateSharedState]);

  // 원홀 수치 기준 20개 오발 크기 옵션 드롭다운 동적 생성
  const dynamicOvalOptions = useMemo(() => getDynamicOvalOptions(holeSize), [holeSize]);

  // 📌 [지공사님 핵심 지침 100% 반영]: 원본 스판 타입 변경 시 목표 스판 타입 스마트 기본 제시
  // - Center to Center 선택 시 -> Cut to Cut 기본 제시
  // - Cut to Cut 선택 시 -> Center to Center 기본 제시
  // - Actual Span 선택 시 -> Center to Center 기본 제시
  const handleFromTypeChange = useCallback((newFromType) => {
    let nextToType = 'Cut to Cut';
    if (newFromType === 'Center to Center') {
      nextToType = 'Cut to Cut';
    } else if (newFromType === 'Cut to Cut') {
      nextToType = 'Center to Center';
    } else if (newFromType === 'Actual Span') {
      nextToType = 'Center to Center';
    }
    updateSharedState({ fromType: newFromType, toType: nextToType });
  }, [updateSharedState]);

  // 변환할 스판 타입 옵션 (현재 원본 스판 타입 제외)
  const availableToTypeOptions = useMemo(() => {
    return SPAN_TYPE_OPTIONS.filter((opt) => opt !== fromType);
  }, [fromType]);

  // 📐 Center to Center 및 Cut to Cut 상호 간 변환 시 인서트 및 원홀/오발 수치 필요 없음 (5개 제원만 필요)
  const isNoInsertOrOvalRequired =
    (fromType === 'Center to Center' && toType === 'Cut to Cut') ||
    (fromType === 'Cut to Cut' && toType === 'Center to Center');

  // 📌 오발 수치 한 가지만 입력되었는지 검증 (크기만 또는 각도만 입력 시 계산 차단)
  const hasPartialOval = (Boolean(ovalSize) && !ovalAngle) || (!ovalSize && Boolean(ovalAngle));

  // 📌 Actual Span 연계 변환 시 오발 수치 2개 모두 비어있는지 판별 (결과 모달 안내용)
  const isOvalMissingNotice =
    (fromType === 'Actual Span' || toType === 'Actual Span') && (!ovalSize && !ovalAngle);

  // 📌 초기 진입 시부터 실시간 필수 항목 미입력 상태 검증
  const isMidSpanMissing = !midSpanStr;
  const isRingSpanMissing = !ringSpanStr;
  const isMidHoleCutMissing = !midHoleCut;
  const isRingHoleCutMissing = !ringHoleCut;
  const isThumbHoleCutMissing = !thumbHoleCut;

  // 필요 없는 항목은 알림 100% OFF (false)
  const isMidInsertMissing = isNoInsertOrOvalRequired ? false : !midInsert;
  const isRingInsertMissing = isNoInsertOrOvalRequired ? false : !ringInsert;
  const isThumbMissing = isNoInsertOrOvalRequired ? false : (!holeSize && !ovalSize);
  const isOvalAngleMissing = isNoInsertOrOvalRequired ? false : !ovalAngle;
  const isOvalSizeMissing = isNoInsertOrOvalRequired ? false : !ovalSize;

  // 📌 폼 차단 조건:
  // - CTC ↔ C-C 상호 변환: 5개 필수 제원만 채워지면 허용
  // - Actual Span 연계 일반 변환: 8개 기본 제원 채워지면 허용, 오발 수치 1개만 단독 입력 시 차단
  const isFormBlocked =
    isMidSpanMissing ||
    isRingSpanMissing ||
    isMidHoleCutMissing ||
    isRingHoleCutMissing ||
    isThumbHoleCutMissing ||
    isMidInsertMissing ||
    isRingInsertMissing ||
    isThumbMissing ||
    (isNoInsertOrOvalRequired ? false : hasPartialOval);

  // 📐 실시간 3종 스판 상호 변환 수식 연산 (Hub 법칙 적용)
  const midConverted = useMemo(() => {
    return convertSpanValue({
      spanValueStr: midSpanStr,
      inputValueStr: midSpanStr,
      fromType,
      toType,
      fingerDrillDiamStr: midHoleCut,
      holeCutStr: midHoleCut,
      fingerInsertDiamStr: midInsert,
      insertStr: midInsert,
      thumbDrillDiamStr: thumbHoleCut,
      thumbHoleCutStr: thumbHoleCut,
      thumbEffectiveDiamStr: ovalSize || holeSize,
      thumbEffectiveStr: ovalSize || holeSize,
      ovalCutDiamStr: ovalCut || holeSize,
      ovalCutStr: ovalCut || holeSize,
      ovalAngleDeg: ovalAngle,
      denomMode,
    });
  }, [
    midSpanStr,
    fromType,
    toType,
    midHoleCut,
    midInsert,
    thumbHoleCut,
    holeSize,
    ovalSize,
    ovalCut,
    ovalAngle,
    denomMode,
  ]);

  const ringConverted = useMemo(() => {
    return convertSpanValue({
      spanValueStr: ringSpanStr,
      inputValueStr: ringSpanStr,
      fromType,
      toType,
      fingerDrillDiamStr: ringHoleCut,
      holeCutStr: ringHoleCut,
      fingerInsertDiamStr: ringInsert,
      insertStr: ringInsert,
      thumbDrillDiamStr: thumbHoleCut,
      thumbHoleCutStr: thumbHoleCut,
      thumbEffectiveDiamStr: ovalSize || holeSize,
      thumbEffectiveStr: ovalSize || holeSize,
      ovalCutDiamStr: ovalCut || holeSize,
      ovalCutStr: ovalCut || holeSize,
      ovalAngleDeg: ovalAngle,
      denomMode,
    });
  }, [
    ringSpanStr,
    fromType,
    toType,
    ringHoleCut,
    ringInsert,
    thumbHoleCut,
    holeSize,
    ovalSize,
    ovalCut,
    ovalAngle,
    denomMode,
  ]);

  // 📐 실시간 구면 미드라인 삼각법 연산 (마킹 가이드용)
  const midlineResult = useMemo(() => {
    return calculateSphericalMidline({
      midSpanStr,
      ringSpanStr,
      bridgeDiamStr: bridgeStr,
      fromType,
      markingType,
      fingerDrillDiamStr: midHoleCut,
      fingerInsertDiamStr: midInsert,
      thumbDrillDiamStr: thumbHoleCut,
      thumbEffectiveDiamStr: ovalSize || holeSize,
      ovalCutDiamStr: ovalCut || holeSize,
      ovalAngleDeg: ovalAngle,
      denomMode,
    });
  }, [
    midSpanStr,
    ringSpanStr,
    bridgeStr,
    fromType,
    markingType,
    midHoleCut,
    midInsert,
    ringHoleCut,
    ringInsert,
    thumbHoleCut,
    holeSize,
    ovalSize,
    ovalCut,
    ovalAngle,
    denomMode,
  ]);

  const handleConvertClick = () => {
    if (!isFormBlocked) {
      setIsModalOpen(true);
    }
  };

  // 🔄 스판 변환기 입력 수치 초기화 함수 (초기 기본값: Cut to Cut -> Center to Center)
  const handleClearInputs = () => {
    updateSharedState({
      fromType: 'Cut to Cut',
      toType: 'Center to Center',
      midSpanStr: '',
      ringSpanStr: '',
      bridgeStr: '3/16',
      midHoleCut: '31/32',
      midInsert: '',
      ringHoleCut: '31/32',
      ringInsert: '',
      thumbHoleCut: '1 1/4',
      holeSize: '',
      ovalSize: '',
      ovalCut: '',
      ovalCut1: '',
      ovalCut2: '',
      ovalAngle: '',
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 카드 1: 스판 타입 선택 및 손방향 배치 (스냅샷 2번 원안 100% 복원) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 📌 1열 (2단): [현재 스판 타입 (From)] | [손방향 (왼손 | 오른손)] */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <SelectField
            density="compact"
            label="현재 스판 타입 (From)"
            onChange={handleFromTypeChange}
            options={SPAN_TYPE_OPTIONS}
            value={fromType}
          />

          {/* 손방향 토글 스위치 */}
          <div className="flex items-center bg-slate-100 border border-slate-200 p-0.5 rounded-md h-10 w-full shadow-2xs">
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

        {/* 📌 2열 (2단): [중지 스판] | [약지 스판] */}
        <div className="grid grid-cols-2 gap-3">
          <KeypadField
            density="compact"
            isRequiredMissing={isMidSpanMissing}
            label="중지 스판"
            onOpen={() => setActiveKeypad('mid')}
            placeholder="입력"
            value={midSpanStr}
          />
          <KeypadField
            density="compact"
            isRequiredMissing={isRingSpanMissing}
            label="약지 스판"
            onOpen={() => setActiveKeypad('ring')}
            placeholder="입력"
            value={ringSpanStr}
          />
        </div>
      </div>

      {/* 카드 2: 세부 규격 및 하단 변환 실행 버튼 (스냅샷 2번 원안 100% 복원) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 📌 단일 회색 통합 외곽 박스 */}
        <div className="space-y-3.5 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
          {/* 1. 손가락 제원 4개 필드 */}
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              density="compact"
              isRequiredMissing={isMidHoleCutMissing}
              label="중지 홀컷"
              onChange={(v) => handleStateChange('midHoleCut', v)}
              options={MID_HOLE_CUT_OPTIONS}
              value={midHoleCut}
            />
            <SelectField
              density="compact"
              isRequiredMissing={isMidInsertMissing}
              label="중지 인서트"
              onChange={(v) => handleStateChange('midInsert', v)}
              options={FINGER_INSERT_OPTIONS}
              value={midInsert}
            />
            <SelectField
              density="compact"
              isRequiredMissing={isRingHoleCutMissing}
              label="약지 홀컷"
              onChange={(v) => handleStateChange('ringHoleCut', v)}
              options={RING_HOLE_CUT_OPTIONS}
              value={ringHoleCut}
            />
            <SelectField
              density="compact"
              isRequiredMissing={isRingInsertMissing}
              label="약지 인서트"
              onChange={(v) => handleStateChange('ringInsert', v)}
              options={FINGER_INSERT_OPTIONS}
              value={ringInsert}
            />
          </div>

          {/* 2. 엄지 제원 4개 필드 */}
          <div className="pt-2.5 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                density="compact"
                isRequiredMissing={isThumbHoleCutMissing}
                label="엄지 홀컷"
                onChange={(v) => handleStateChange('thumbHoleCut', v)}
                options={THUMB_HOLE_CUT_OPTIONS}
                value={thumbHoleCut}
              />
              <SelectField
                density="compact"
                isRequiredMissing={isThumbMissing}
                label="엄지 원홀"
                onChange={(v) => handleStateChange({ holeSize: v, ovalCut: v || '' })}
                options={HOLE_OPTIONS}
                value={holeSize}
              />
              <SelectField
                density="compact"
                isRequiredMissing={isOvalSizeMissing}
                label="오발 크기"
                onChange={(v) => handleStateChange('ovalSize', v)}
                options={dynamicOvalOptions}
                placeholder=""
                value={holeSize ? ovalSize : ''}
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

        {/* 📌 하단 2단 배치: [목표 스판 타입 (To)] (좌측 50%) + [스판 변환] 버튼 (우측 50%) */}
        <div className="grid grid-cols-2 gap-3 items-end pt-1">
          <SelectField
            density="compact"
            label="목표 스판 타입 (To)"
            onChange={(val) => handleStateChange('toType', val)}
            options={availableToTypeOptions}
            value={toType}
          />
          <div>
            <button
              type="button"
              onClick={handleConvertClick}
              className="h-10 w-full bg-slate-800 text-white rounded-md text-sm font-black shadow-2xs hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center"
            >
              스판 변환
            </button>
          </div>
        </div>
      </div>

      {/* 키패드 모달 연동 */}
      {activeKeypad === 'mid' && (
        <FractionKeypad
          ghostValue={ringSpanStr}
          initialValue={midSpanStr}
          isOpen={true}
          mode="span"
          onClose={() => setActiveKeypad(null)}
          onConfirm={(val) => {
            handleStateChange('midSpanStr', val);
            setActiveKeypad(null);
          }}
          title="중지 스판 입력"
        />
      )}

      {activeKeypad === 'ring' && (
        <FractionKeypad
          ghostValue={midSpanStr}
          initialValue={ringSpanStr}
          isOpen={true}
          mode="span"
          onClose={() => setActiveKeypad(null)}
          onConfirm={(val) => {
            handleStateChange('ringSpanStr', val);
            setActiveKeypad(null);
          }}
          title="약지 스판 입력"
        />
      )}

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

      {/* 📌 전면 결과 모달 (지연 로딩) */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <SpanResultModal
            denomMode={denomMode}
            fromType={fromType}
            isOpen={isModalOpen}
            isOvalMissingNotice={isOvalMissingNotice}
            midConverted={midConverted}
            onConfirm={() => setIsModalOpen(false)}
            onOpenMarkingGuide={() => {
              setIsMarkingModalOpen(true);
            }}
            ringConverted={ringConverted}
            setDenomMode={(mode) => updateSharedState('denomMode', mode)}
            toType={toType}
          />
        </Suspense>
      )}

      {/* 📌 미드라인 마킹 가이드 결과 모달 (지연 로딩) */}
      {isMarkingModalOpen && (
        <Suspense fallback={null}>
          <MidlineResultModal
            denomMode={denomMode}
            isOpen={isMarkingModalOpen}
            isOvalMissingNotice={isOvalMissingNotice}
            midlineResult={midlineResult}
            onChangeMarkingType={(type) => setMarkingType(type)}
            onConfirm={() => setIsMarkingModalOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default React.memo(SpanConverterView);
