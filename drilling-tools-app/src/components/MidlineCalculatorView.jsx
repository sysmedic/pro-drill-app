import React, { useState, useMemo } from 'react';
import KeypadField from './ui/KeypadField.jsx';
import SelectField from './ui/SelectField.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import MidlineResultModal from './MidlineResultModal.jsx';
import { calculateSphericalMidline } from '../lib/midlineCalculator.js';
import {
  SPAN_TYPE_OPTIONS,
  MARKING_TYPE_OPTIONS,
  BRIDGE_OPTIONS,
  MID_HOLE_CUT_OPTIONS,
  RING_HOLE_CUT_OPTIONS,
  THUMB_HOLE_CUT_OPTIONS,
  FINGER_INSERT_OPTIONS,
  HOLE_OPTIONS,
  getDynamicOvalOptions,
} from '../lib/chartOptions.js';

export default function MidlineCalculatorView({ sharedState, updateSharedState }) {
  const {
    midSpanStr,
    ringSpanStr,
    bridgeStr = '3/16',
    fromType,
    markingType = 'Cut to Cut',
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

  // 키패드 및 모달 상태 ('mid' | 'ring' | 'bridge' | 'angle' | null)
  const [activeKeypad, setActiveKeypad] = useState(null);

  // 📌 결과 전면 모달 오픈 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStateChange = (keyOrObj, val) => {
    updateSharedState(keyOrObj, val);
  };

  // 원홀 수치 기준 20개 오발 크기 옵션 드롭다운 동적 생성
  const dynamicOvalOptions = useMemo(() => getDynamicOvalOptions(holeSize), [holeSize]);

  // 📐 Center to Center 및 Cut to Cut 상호 간 변환/마킹 시 인서트 및 원홀/오발 수치 불필요 (5개 제원만 필요)
  const isNoInsertOrOvalRequired = fromType !== 'Actual Span' && markingType !== 'Actual Span';

  // 📌 오발 수치 한 가지만 입력되었는지 검증 (크기만 또는 각도만 입력 시 계산 차단)
  const hasPartialOval = (Boolean(ovalSize) && !ovalAngle) || (!ovalSize && Boolean(ovalAngle));

  // 📌 Actual Span 연계 미드라인 연산 시 오발 수치 2개 모두 비어있는지 판별 (결과 모달 안내용)
  const isOvalMissingNotice =
    (fromType === 'Actual Span' || markingType === 'Actual Span') && (!ovalSize && !ovalAngle);

  // 📌 초기 진입 시부터 실시간 필수 항목 미입력 상태 검증
  const isMidSpanMissing = !midSpanStr;
  const isRingSpanMissing = !ringSpanStr;
  const isMidHoleCutMissing = !midHoleCut;
  const isRingHoleCutMissing = !ringHoleCut;
  const isThumbHoleCutMissing = !thumbHoleCut;

  // 필요 없는 항목은 경고 알림 100% OFF (false)
  const isMidInsertMissing = isNoInsertOrOvalRequired ? false : !midInsert;
  const isRingInsertMissing = isNoInsertOrOvalRequired ? false : !ringInsert;
  const isThumbMissing = isNoInsertOrOvalRequired ? false : (!holeSize && !ovalSize);
  const isOvalAngleMissing = isNoInsertOrOvalRequired ? false : !ovalAngle;
  const isOvalSizeMissing = isNoInsertOrOvalRequired ? false : !ovalSize;

  // 📌 폼 차단 조건:
  // - C-C / Cut-Cut 상호 모드: 5개 필수 제원만 채워지면 연산 가동
  // - Actual Span 포함 일반 모드: 8개 기본 제원 채워지면 허용, 오발 수치 1개만 단독 입력 시 차단
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

  // 📐 실시간 구면 미드라인 삼각법 연산
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

  const handleCalculateClick = () => {
    if (!isFormBlocked) {
      setIsModalOpen(true);
    }
  };

  // 🔄 미드라인 마킹 입력 수치 초기화 함수
  const handleClearInputs = () => {
    updateSharedState({
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
      {/* 카드 1: [기준 스판 타입 | 손방향] 2단, [브릿지 : 중지스판 : 약지스판] 2:4:4 비율 3단 배치 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        {/* 1열 (2단): [기준 스판 타입] | [손방향 (왼손 | 오른손)] */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <SelectField
            density="compact"
            label="기준 스판 타입 (Base)"
            onChange={(val) => handleStateChange('fromType', val)}
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
                title="미드라인 마킹 입력 수치 초기화"
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

        {/* 2열 (30:35:35 비율 3단): [브릿지(30%)] [중지 스판(35%)] [약지 스판(35%)] */}
        <div className="grid grid-cols-[30fr_35fr_35fr] gap-2 sm:gap-3 pt-1">
          <div>
            <SelectField
              density="compact"
              label="브릿지"
              onChange={(val) => {
                if (val === '직접입력') {
                  setActiveKeypad('bridge');
                } else {
                  handleStateChange('bridgeStr', val);
                }
              }}
              options={BRIDGE_OPTIONS}
              value={BRIDGE_OPTIONS.includes(bridgeStr) ? bridgeStr : '직접입력'}
            />
          </div>

          <div>
            <KeypadField
              density="compact"
              isRequiredMissing={isMidSpanMissing}
              label="중지 스판"
              onOpen={() => setActiveKeypad('mid')}
              placeholder="입력"
              value={midSpanStr}
            />
          </div>

          <div>
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
      </div>

      {/* 카드 2: 세부 규격 및 하단 2단 배치 [마킹 방식 | 미드라인 마킹 버튼] */}
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
                placeholder="오발 지공시 필수"
                value={ovalAngle ? `${ovalAngle}°` : ''}
              />
            </div>
          </div>
        </div>

        {/* 📌 하단 2단 배치: 앞쪽 [마킹 방식] + 뒤쪽 [미드라인 마킹] 버튼 */}
        <div className="grid grid-cols-2 gap-3 items-end pt-1">
          <SelectField
            density="compact"
            label="마킹 방식 (Marking)"
            onChange={(val) => handleStateChange('markingType', val)}
            options={MARKING_TYPE_OPTIONS}
            value={markingType}
          />
          <div>
            <button
              type="button"
              onClick={handleCalculateClick}
              className="h-10 w-full bg-slate-800 text-white rounded-md text-sm font-black shadow-2xs hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center"
            >
              미드라인 마킹
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

      {activeKeypad === 'bridge' && (
        <FractionKeypad
          initialValue={bridgeStr}
          isOpen={true}
          mode="span"
          onClose={() => setActiveKeypad(null)}
          onConfirm={(val) => {
            handleStateChange('bridgeStr', val);
            setActiveKeypad(null);
          }}
          title="브릿지 수치 입력"
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
      <MidlineResultModal
        denomMode={denomMode}
        isOpen={isModalOpen}
        isOvalMissingNotice={isOvalMissingNotice}
        midlineResult={midlineResult}
        onConfirm={() => setIsModalOpen(false)}
        setDenomMode={(mode) => updateSharedState('denomMode', mode)}
      />
    </div>
  );
}
