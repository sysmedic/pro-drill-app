import React, { useState, useMemo, useCallback, Suspense } from 'react';
import KeypadField from './ui/KeypadField.jsx';
import SelectField from './ui/SelectField.jsx';
import FractionKeypad from './FractionKeypad.jsx';
import { calculateSphericalMidline } from '../lib/midlineCalculator.js';
import {
  SPAN_TYPE_OPTIONS,
  BRIDGE_OPTIONS,
  MID_HOLE_CUT_OPTIONS,
  RING_HOLE_CUT_OPTIONS,
  THUMB_HOLE_CUT_OPTIONS,
  FINGER_INSERT_OPTIONS,
  TIP_TYPE_OPTIONS,
  HOLE_OPTIONS,
  getDynamicOvalOptions,
} from '../lib/chartOptions.js';
import { useI18n } from '../lib/i18n.jsx';

const MidlineResultModal = React.lazy(() => import('./MidlineResultModal.jsx'));

function MidlineCalculatorView({ sharedState, updateSharedState }) {
  const { t } = useI18n();
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
    midTipType = '',
    ringTipType = '',
    isLeftHanded,
  } = sharedState;

  // 키패드 및 모달 상태 ('mid' | 'ring' | 'bridge' | 'angle' | null)
  const [activeKeypad, setActiveKeypad] = useState(null);

  // 📌 결과 전면 모달 오픈 상태
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStateChange = useCallback((keyOrObj, val) => {
    updateSharedState(keyOrObj, val);
  }, [updateSharedState]);

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

  const isActualSpanInvolved = fromType === 'Actual Span' || markingType === 'Actual Span';
  const isMidTipMissing = isActualSpanInvolved ? !midTipType : false;
  const isRingTipMissing = isActualSpanInvolved ? !ringTipType : false;

  // 📌 폼 차단 조건:
  const isFormBlocked =
    isMidSpanMissing ||
    isRingSpanMissing ||
    isMidHoleCutMissing ||
    isRingHoleCutMissing ||
    isThumbHoleCutMissing ||
    isMidInsertMissing ||
    isRingInsertMissing ||
    isThumbMissing ||
    isMidTipMissing ||
    isRingTipMissing ||
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
      ringDrillDiamStr: ringHoleCut,
      fingerInsertDiamStr: midInsert,
      thumbDrillDiamStr: thumbHoleCut,
      thumbEffectiveDiamStr: ovalSize || holeSize,
      ovalCutDiamStr: ovalCut || holeSize,
      ovalAngleDeg: ovalAngle,
      midTipType,
      ringTipType,
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
    midTipType,
    ringTipType,
    denomMode,
  ]);

  const handleCalculateClick = () => {
    if (!isFormBlocked) {
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in p-4 sm:p-5">
      {/* 카드 1: 스판 타입 선택 및 손방향 배치 */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 📌 1열 (2단): [기준 스판 타입 (From)] | [손방향 (왼손 | 오른손)] */}
        <div className="grid grid-cols-2 gap-3 items-end">
          <SelectField
            density="compact"
            label={t('fromSpanType')}
            onChange={(val) => handleStateChange('fromType', val)}
            options={SPAN_TYPE_OPTIONS}
            value={fromType}
          />

          {/* 손방향 토글 스위치 */}
          <div className="flex items-center bg-slate-100 border border-slate-300 p-0.5 rounded-md h-10 w-full shadow-2xs">
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

        {/* 📌 2열 (3단 균등): [중지 스판] | [약지 스판] | [브릿지] */}
        <div className="grid grid-cols-3 gap-2">
          <KeypadField
            density="compact"
            isRequiredMissing={isMidSpanMissing}
            label={t('middleSpan')}
            onOpen={() => setActiveKeypad('mid')}
            placeholder="입력"
            value={midSpanStr}
          />
          <KeypadField
            density="compact"
            isRequiredMissing={isRingSpanMissing}
            label={t('ringSpan')}
            onOpen={() => setActiveKeypad('ring')}
            placeholder="입력"
            value={ringSpanStr}
          />
          <SelectField
            density="compact"
            label={t('bridge')}
            onChange={(v) => handleStateChange('bridgeStr', v)}
            options={BRIDGE_OPTIONS}
            value={BRIDGE_OPTIONS.includes(bridgeStr) ? bridgeStr : BRIDGE_OPTIONS[1]}
          />
        </div>
      </div>

      {/* 카드 2: 세부 규격 및 하단 마킹 실행 버튼 */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 📌 단일 회색 통합 외곽 박스 */}
        <div className="space-y-3.5 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-300">
          {/* 1. 중지 제원 3열 (홀컷 | 인서트 | 팁 종류) */}
          <div className="grid grid-cols-3 gap-2">
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
              label="인서트 사이즈"
              onChange={(v) => handleStateChange('midInsert', v)}
              options={FINGER_INSERT_OPTIONS}
              value={midInsert}
            />
            <SelectField
              density="compact"
              isRequiredMissing={isMidTipMissing}
              label="팁 종류"
              onChange={(v) => handleStateChange('midTipType', v)}
              options={TIP_TYPE_OPTIONS}
              placeholder="선택"
              value={midTipType}
            />
          </div>

          {/* 2. 약지 제원 3열 (홀컷 | 인서트 | 팁 종류) */}
          <div className="grid grid-cols-3 gap-2">
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
              label="인서트 사이즈"
              onChange={(v) => handleStateChange('ringInsert', v)}
              options={FINGER_INSERT_OPTIONS}
              value={ringInsert}
            />
            <SelectField
              density="compact"
              isRequiredMissing={isRingTipMissing}
              label="팁 종류"
              onChange={(v) => handleStateChange('ringTipType', v)}
              options={TIP_TYPE_OPTIONS}
              placeholder="선택"
              value={ringTipType}
            />
          </div>

          {/* 3. 엄지 제원 4개 필드 */}
          <div className="pt-2.5 border-t border-slate-300">
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
                label={t('ovalSize')}
                onChange={(v) => handleStateChange('ovalSize', v)}
                options={dynamicOvalOptions}
                placeholder=""
                value={holeSize ? ovalSize : ''}
              />
              <KeypadField
                density="compact"
                isRequiredMissing={isOvalAngleMissing}
                label={t('ovalAngle')}
                onOpen={() => setActiveKeypad('angle')}
                placeholder={<>각도<span className="hidden sm:inline"> 입력</span></>}
                value={ovalAngle ? `${ovalAngle}°` : ''}
              />
            </div>
          </div>
        </div>

        {/* 📌 하단 마킹 실행 버튼 (Full Width) */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleCalculateClick}
            disabled={isFormBlocked}
            className="h-10 sm:h-11 w-full bg-slate-800 text-white rounded-md text-sm sm:text-base font-black shadow-2xs hover:bg-slate-900 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            마킹 계산
          </button>
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

      {/* 📌 전면 결과 모달 (지연 로딩) */}
      {isModalOpen && (
        <Suspense fallback={null}>
          <MidlineResultModal
            denomMode={denomMode}
            isOpen={isModalOpen}
            isOvalMissingNotice={isOvalMissingNotice}
            midlineResult={midlineResult}
            sharedState={sharedState}
            onChangeMarkingType={(type) => updateSharedState('markingType', type)}
            onConfirm={() => setIsModalOpen(false)}
            setDenomMode={(mode) => updateSharedState('denomMode', mode)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default React.memo(MidlineCalculatorView);
