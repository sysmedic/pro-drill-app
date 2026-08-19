import React from 'react';
import ModalShell from '../../components/ui/ModalShell.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function SpanGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title="💡 스판 연산 가이드"
      titleId="span-guide-modal-title"
      zClassName="z-[150]"
    >
      <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto select-none text-slate-800">
        {/* 요약 메인 카드 */}
        <div className="bg-indigo-50/80 p-4 rounded-xl border border-indigo-200 space-y-2">
          <div className="flex items-center gap-1.5 text-indigo-950 font-black text-sm">
            <Icon name="helpCircle" className="text-indigo-600 shrink-0" size={16} strokeWidth={2.5} />
            <span>만능 스판 변환기(Universal Span) 원리</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            볼링 지공에서 스판은 측정 위치에 따라 3가지 타입으로 분류되며, <strong className="text-indigo-900 font-extrabold">C-C (Center to Center)</strong>를 절대 기준점(Hub)으로 삼아 오차 없이 자동 계산됩니다.
          </p>
        </div>

        {/* 3가지 스판 타입 카드 상세 */}
        <div className="space-y-2.5">
          {/* 1. Center to Center */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Center to Center (C-C)
              </span>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                절대 기준 앵커
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              지공 홀 중심에서 엄지 홀 중심까지의 <strong>볼 구면 호 길이</strong>입니다. 홀 크기와 무관한 절대 고유값입니다.
            </p>
          </div>

          {/* 2. Cut to Cut */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                Cut to Cut (CTC / 드릴 스판)
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                비터 외경 차감
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              실제 공에 드릴링하는 구멍 입구 간 거리를 뜻합니다.
              <br />
              <code className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono mt-1 inline-block">
                CTC = C-C - 손가락비터반경 - 엄지비터반경
              </code>
            </p>
          </div>

          {/* 3. Actual Span */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                Actual Span (실측 / 인서트 스판)
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                실측 장착면 표면
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-normal">
              중/약지 인서트 턱과 엄지 그립/인서트 실측 표면 간 거리입니다.
              <br />
              <code className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono mt-1 inline-block">
                Actual = C-C - 인서트반경 - 엄지장착반경
              </code>
            </p>
          </div>
        </div>

        {/* 16분/32분법 기약분수 정밀도 팁 */}
        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
          <Icon name="checkCircle" className="text-emerald-600 shrink-0" size={15} />
          <span>
            모든 스판 연산 결과는 <strong>16분법 (1/16")</strong> 및 <strong>32분법 (1/32")</strong> 기약분수로 정밀 반올림되어 실시간 계산됩니다.
          </span>
        </div>

        {/* 닫기 버튼 */}
        <div className="pt-2">
          <button
            onClick={onClose}
            type="button"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-colors active:scale-95 text-center cursor-pointer shadow-sm"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
