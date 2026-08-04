import ModalShell from '../../components/ui/ModalShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

export default function ConvertProcessModal({
  isOpen,
  onClose,
  isConverting,
  convertData,
  onApply
}) {
  if (!isOpen) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="sm" title="🔄 레이아웃 변환 과정">
      <div className="p-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
        {isConverting ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-700 animate-pulse">
              볼러 스펙 기반 변환 수치를 연산하고 있습니다...
            </p>
          </div>
        ) : convertData ? (
          <>
            {/* 1. 변환 전 -> 변환 후 요약 카드 (클라우드/AI 설정 모달 스타일 일치화) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  {convertData.convertType}
                </span>
                {convertData.specSummary && (
                  <span className="text-[11px] text-slate-500 font-bold">
                    스펙: {convertData.specSummary}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2 text-center bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                {/* 원본 레이아웃 */}
                <div className="sm:col-span-2 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 mb-0.5">기존 원본 수치</span>
                  <span className="text-sm font-black text-slate-800 break-all">{convertData.fromLayout}</span>
                </div>

                {/* 화살표 아이콘 */}
                <div className="flex items-center justify-center text-indigo-500 py-1 sm:py-0">
                  <Icon name="chevronDown" className="sm:-rotate-90 text-indigo-600" size={20} strokeWidth={3} />
                </div>

                {/* 변환된 레이아웃 */}
                <div className="sm:col-span-2 flex flex-col items-center bg-indigo-50/60 border border-indigo-200 p-2 rounded-lg w-full">
                  <span className="text-[10px] font-bold text-indigo-600 mb-0.5">변환 완료 수치</span>
                  <span className="text-base font-black text-indigo-900 break-all">{convertData.toLayout}</span>
                </div>
              </div>
            </div>

            {/* 2. 변환 계산 수식 및 이유 상세 설명 */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200 space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-900">
                <span className="text-base">💡</span>
                <h3 className="text-sm font-black text-slate-800">변환 연산 과정 및 가이드</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                {convertData.reason || '볼러의 PAP 수치 및 틸트를 반영하여 변환 계산을 완료했습니다.'}
              </p>
            </div>

            {/* 3. 액션 버튼 영역 (시스템 다른 모달과 100% 동일 규격) */}
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={onClose} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-sm font-black transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                onClick={onApply}
                size="sm"
                variant="primary"
              >
                차트에 적용
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
