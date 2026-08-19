import React, { useState, useMemo, useEffect } from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { SPAN_TYPE_OPTIONS } from './chartOptions.js';
import { convertSpanValue } from '../../lib/spanConverter.js';

export default function SpanConverterModal({
  isOpen,
  onClose,
  data = {},
  onApply
}) {
  if (!isOpen) return null;

  const currentSpanType = data?.spanType || 'Actual Span';
  const currentLeft = data?.spanLeft || '';
  const currentRight = data?.spanRight || '';
  const isLeftHanded = data?.handedness === 'left';

  // 현재 스판 타입을 제외한 변환 대상 스판 타입 목록
  const targetOptions = useMemo(() => {
    return SPAN_TYPE_OPTIONS.filter((type) => type !== currentSpanType);
  }, [currentSpanType]);

  // 목표 스판 타입 상태
  const [targetType, setTargetType] = useState(() => {
    return targetOptions[0] || 'Cut to Cut';
  });

  // 분수 정밀도 모드 (32: 32분법 / 16: 16분법, 기본 32)
  const [denomMode, setDenomMode] = useState(32);

  useEffect(() => {
    if (!targetOptions.includes(targetType)) {
      setTargetType(targetOptions[0] || 'Cut to Cut');
    }
  }, [currentSpanType, targetOptions, targetType]);

  // 변환 후 스판 수치 연산
  const previewValues = useMemo(() => {
    const isThumbless = !!data?.isThumbless;
    const midPitch = data?.midPitch || {};
    const ringPitch = data?.ringPitch || {};
    const thumbDetails = data?.thumbDetails || {};

    const firstPitch = isLeftHanded ? ringPitch : midPitch;
    const secondPitch = isLeftHanded ? midPitch : ringPitch;

    let newLeft = currentLeft;
    let newRight = currentRight;

    if (!isThumbless && currentSpanType !== targetType) {
      if (currentLeft) {
        newLeft = convertSpanValue({
          spanValueStr: currentLeft,
          fromType: currentSpanType,
          toType: targetType,
          pitchData: firstPitch,
          thumbDetails,
          denomMode
        });
      }
      if (currentRight) {
        newRight = convertSpanValue({
          spanValueStr: currentRight,
          fromType: currentSpanType,
          toType: targetType,
          pitchData: secondPitch,
          thumbDetails,
          denomMode
        });
      }
    }

    return {
      newLeft,
      newRight
    };
  }, [data, currentSpanType, targetType, currentLeft, currentRight, isLeftHanded, denomMode]);

  const handleConfirm = () => {
    onApply({
      spanType: targetType,
      spanLeft: previewValues.newLeft,
      spanRight: previewValues.newRight
    });
    onClose();
  };

  const firstLabel = isLeftHanded ? '약지' : '중지';
  const secondLabel = isLeftHanded ? '중지' : '약지';

  // Span 타입 이름 표기 헬퍼 (Center to Center 앞뒤 아래 화살표 배치)
  const renderSpanTypeName = (type) => {
    if (type === 'Center to Center') {
      return (
        <span className="inline-flex items-center justify-center gap-1">
          <Icon name="arrowDown" size={12} strokeWidth={3} className="shrink-0 text-slate-500" />
          <span>Center to Center</span>
          <Icon name="arrowDown" size={12} strokeWidth={3} className="shrink-0 text-slate-500" />
        </span>
      );
    }
    return type;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="Universal Span Converter"
      titleId="span-converter-modal-title"
      zClassName="z-[150]"
    >
      <div className="p-5 flex flex-col gap-6 max-h-[70vh] overflow-y-auto select-none">
        {/* 경고/안내 영역 컨테이너 (ExitConfirmModal 디자인 기준 1:1 패밀리 일치화) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
          {/* 1행: 현재 스판타입 단독 와이드 타일, 2행: 목표 스판 2개 버튼 */}
          <div className="space-y-2">
            <div className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-center flex items-center justify-center font-black text-xs sm:text-sm shadow-2xs">
              {renderSpanTypeName(currentSpanType)}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {targetOptions.map((typeOption) => {
                const isSelected = targetType === typeOption;

                return (
                  <button
                    key={typeOption}
                    type="button"
                    onClick={() => setTargetType(typeOption)}
                    className={`py-2.5 px-3 rounded-xl border transition-all text-center cursor-pointer font-black text-xs sm:text-sm ${
                      isSelected
                        ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-950 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {renderSpanTypeName(typeOption)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 스판 변환 수치 요약 카드 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col gap-3">
            {/* 우측 상단 정밀도 토글 탭 (16분 | 32분) */}
            <div className="flex items-center justify-end border-b border-slate-100 pb-2">
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setDenomMode(16)}
                  className={`px-2.5 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                    denomMode === 16
                      ? 'bg-indigo-50 border border-indigo-500 text-indigo-950 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  16분
                </button>
                <button
                  type="button"
                  onClick={() => setDenomMode(32)}
                  className={`px-2.5 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                    denomMode === 32
                      ? 'bg-indigo-50 border border-indigo-500 text-indigo-950 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  32분
                </button>
              </div>
            </div>

            {/* 2줄 세로 수치 배치 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  {firstLabel} 스판
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 line-through">
                    {currentLeft || '0'}
                  </span>
                  <Icon name="arrowRight" className="text-indigo-400" size={13} strokeWidth={2.5} />
                  <span className="text-sm sm:text-base font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                    {previewValues.newLeft || '0'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  {secondLabel} 스판
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 line-through">
                    {currentRight || '0'}
                  </span>
                  <Icon name="arrowRight" className="text-indigo-400" size={13} strokeWidth={2.5} />
                  <span className="text-sm sm:text-base font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                    {previewValues.newRight || '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 액션 버튼 영역 (가로 1행 2분할 배치) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button 
            onClick={onClose} 
            type="button"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-black transition-colors active:scale-95 text-center cursor-pointer"
          >
            취소
          </button>
          <button 
            onClick={handleConfirm}
            type="button"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-colors active:scale-95 text-center shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            변환 적용
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
