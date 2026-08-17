import ModalShell from '../../components/ui/ModalShell.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';

// (Dual) 및 (2LS) 표기 규격화 헬퍼
const formatLayoutText = (text, defaultDual = false) => {
  if (!text) return '';
  let str = text.trim();
  if (str.startsWith('(Dual Angle)')) {
    return str.replace('(Dual Angle)', '(Dual)').trim();
  }
  if (str.startsWith('Dual Angle')) {
    return str.replace('Dual Angle', '(Dual)').trim();
  }
  if (str.startsWith('(Dual)') || str.startsWith('(2LS)')) {
    return str;
  }
  if (str.startsWith('2LS')) {
    return str.replace('2LS', '(2LS)').trim();
  }
  return defaultDual ? `(Dual) ${str}` : `(2LS) ${str}`;
};

// 연산 가이드 문구를 진짜 문장 마침표(.) 다음 무조건 안전 행(줄바꿈) 변경 헬퍼 (숫자 순서표기 오파싱 방지)
const formatReasonSteps = (reasonText) => {
  if (!reasonText) return ['볼러의 PAP 좌표 및 투구 특성을 정밀 계산하여 레이아웃 수치를 안전하게 상호 변환하였습니다.'];
  
  const cleanedText = reasonText.replace(/\r/g, '');
  const steps = [];
  
  // 오직 한글, 영문, 닫는 괄호, 인치/도 기호 뒤에 나오는 진짜 문장 마침표만 안전 분리 (소수점이나 단독 숫자 마침표 예: '4.' 는 절대로 분리 안함)
  const parts = cleanedText.split(/(?<=[가-힣a-zA-Z\)"'°인치]\.)\s+|\n+/);

  parts.forEach(part => {
    let trimmed = part.trim();
    // 앞단에 순서 숫자가 남아있다면 정돈
    trimmed = trimmed.replace(/^\d+\.\s*/, '');
    if (trimmed.length > 0) {
      steps.push(trimmed);
    }
  });

  if (steps.length === 0) {
    return [cleanedText.replace(/^\d+\.\s*/, '').trim() || '볼러의 PAP 좌표 및 투구 특성을 정밀 계산하여 레이아웃 수치를 안전하게 상호 변환하였습니다.'];
  }

  return steps;
};

export default function ConvertProcessModal({
  isOpen,
  onClose,
  isConverting,
  convertData,
  onApply
}) {
  if (!isOpen) return null;

  const reasonSteps = convertData ? formatReasonSteps(convertData.reason) : [];

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} size="sm" title="🔄 레이아웃 변환 및 연산 가이드">
      <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {isConverting ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold text-slate-700 animate-pulse">
              볼러 스펙 기반 레이아웃 변환 연산을 진행하고 있습니다...
            </p>
          </div>
        ) : convertData ? (
          <>
            {/* 이음새 없는 단 1개의 프리미엄 통합 카드 (박스 갇힘 및 배지 전면 제거) */}
            <div className="bg-slate-50/80 p-4.5 rounded-2xl border border-slate-200/80 space-y-4">
              
              {/* 위아래(상하) 수직 대조 배치 (변환 전/후 글자 크기 1:1 동일 동등화) */}
              <div className="flex flex-col items-center justify-center gap-2 text-center py-2">
                {/* 상단: 변환 전 레이아웃 */}
                <div className="text-sm sm:text-base font-extrabold text-slate-700 tracking-tight break-all">
                  {formatLayoutText(convertData.fromLayout, true)}
                </div>

                {/* 중앙 화살표 */}
                <div className="text-indigo-500 py-0.5">
                  <Icon name="chevronDown" className="text-indigo-600" size={20} strokeWidth={3} />
                </div>

                {/* 하단: 변환 후 레이아웃 (동일 폰트 크기 및 두께) */}
                <div className="text-sm sm:text-base font-extrabold text-indigo-900 tracking-tight break-all">
                  {formatLayoutText(convertData.toLayout, false)}
                </div>
              </div>

              {/* 하단 변환 연산 가이드 (숫자/단계별 행 분리 배치로 가독성 극대화) */}
              <div className="pt-3 border-t border-slate-200/70 space-y-2">
                <div className="flex items-center gap-1 text-slate-800">
                  <Icon name="check" size={14} className="text-indigo-600" />
                  <h3 className="text-xs font-black text-slate-800">변환 연산 가이드</h3>
                </div>
                
                {/* 행 분리 리스트 라인 (숫자 번호 전면 삭제 및 단정한 행 분리 배치) */}
                <div className="space-y-2 pl-0.5">
                  {reasonSteps.map((step, idx) => (
                    <div key={idx} className="text-xs text-slate-600 font-medium leading-relaxed break-all">
                      {step.replace(/^\d+\.\s*/, '')}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 액션 버튼 영역 */}
            <div className="flex justify-end gap-2 pt-1">
              <button 
                onClick={onClose} 
                type="button"
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 text-xs font-bold transition-colors active:scale-95 text-center"
              >
                취소
              </button>
              <Button 
                onClick={onApply}
                size="sm"
                variant="primary"
                className="px-5 py-2 text-xs font-black"
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
