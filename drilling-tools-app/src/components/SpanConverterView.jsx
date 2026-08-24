import React, { useState, useMemo } from 'react';
import KeypadField from './ui/KeypadField.jsx';
import SelectField from './ui/SelectField.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import SpanResultModal from './SpanResultModal.jsx';
import { convertSpanValue } from '../lib/spanConverter.js';
import {
  SPAN_TYPE_OPTIONS,
  MID_HOLE_CUT_OPTIONS,
  RING_HOLE_CUT_OPTIONS,
  THUMB_HOLE_CUT_OPTIONS,
  FINGER_INSERT_OPTIONS,
  HOLE_OPTIONS,
  getDynamicOvalOptions,
} from '../lib/chartOptions.js';

export default function SpanConverterView({ sharedState, updateSharedState }) {
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
  } = sharedState;

  // 키패드 및 모달 상태 ('mid' | 'ring' | 'angle' | null)
  const [activeKeypad, setActiveKeypad] = useState(null);

  // 📌 결과 전면 모달 오픈 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStateChange = (keyOrObj, val) => {
    updateSharedState(keyOrObj, val);
  };

  // 원홀 수치 기준 20개 오발 크기 옵션 드롭다운 동적 생성
  const dynamicOvalOptions = useMemo(() => getDynamicOvalOptions(holeSize), [holeSize]);

  // 원본 스판 타입 변경 핸들러
  const handleFromTypeChange = (newFromType) => {
    const nextAvailable = SPAN_TYPE_OPTIONS.filter((opt) => opt !== newFromType);
    const nextToType = nextAvailable.includes(toType) ? toType : nextAvailable[0];
    updateSharedState({ fromType: newFromType, toType: nextToType });
  };

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

  const handleConvertClick = () => {
    if (!isFormBlocked) {
      setIsModalOpen(true);
    }
  };

  // 🔄 스판 변환기 입력 수치 초기화 함수
  const handleClearInputs = () => {
    updateSharedState({
      midSpanStr: '',
      ringSpanStr: '',
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

          {/* 손방향 토글 스위치 & 우측 끝단 수치 초기화 버튼 */}
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-end mb-1">
              <button
                type="button"
                onClick={handleClearInputs}
                className="text-[11px] sm:text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center justify-center shadow-2xs"
                title="스판 변환 입력 수치 초기화"
              >
                <span>수치 초기화</span>
              </button>
            </div>
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

      {/* 📌 전면 결과 모달 */}
      <SpanResultModal
        denomMode={denomMode}
        fromType={fromType}
        isOpen={isModalOpen}
        isOvalMissingNotice={isOvalMissingNotice}
        midConverted={midConverted}
        onConfirm={() => setIsModalOpen(false)}
        ringConverted={ringConverted}
        setDenomMode={(mode) => updateSharedState('denomMode', mode)}
        toType={toType}
      />
    </div>
  );
}
