import { useEffect, useRef } from 'react';

const formatPhoneNumber = (value) => {
  const numbers = value.replace(/[^0-9]/g, '');
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 7) {
    return numbers.replace(/^(\d{3})(\d{1,4})$/, '$1-$2');
  } else if (numbers.length <= 11) {
    return numbers.replace(/^(\d{3})(\d{3,4})(\d{1,4})$/, '$1-$2-$3');
  } else {
    return numbers.replace(/^(\d{3})(\d{4})(\d{4}).*/, '$1-$2-$3');
  }
};

const commonInputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-[15px] sm:text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all";

export default function CustomerFormModal({ customerData, editId, onChange, onClose, onSubmit }) {
  const modalRef = useRef(null);

  useEffect(() => {
    // 1. 모달이 열리기 전 포커스되어 있던 요소(예: '신규' 버튼)를 기억합니다.
    const previousFocusableElement = document.activeElement;

    // 2. 모달이 열리면 첫 번째 입력창(이름)에 강제로 포커스를 줍니다.
    if (modalRef.current) {
      const firstInput = modalRef.current.querySelector('input');
      if (firstInput) firstInput.focus();
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();

      // 3. Tab 키를 눌렀을 때 모달 밖으로 포커스가 빠져나가지 않게 가둡니다 (Focus Trap)
      if (event.key === 'Tab') {
        if (!modalRef.current) return;
        const focusableElements = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0]; // 닫기 버튼
        const lastElement = focusableElements[focusableElements.length - 1]; // 완료 버튼

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 4. 모달이 닫힐 때, 원래 누르고 있던 요소로 포커스를 돌려줍니다.
      if (previousFocusableElement) previousFocusableElement.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-modal-title"
        className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-[768px] shadow-2xl animate-slide-up border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 id="customer-modal-title" className="font-black text-xl sm:text-2xl text-slate-800">
            {editId ? '✏️ 고객 정보 수정' : '✨ 신규 고객 등록'}
          </h3>
          <button type="button" aria-label="고객 정보 모달 닫기" onClick={onClose} className="text-slate-400 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-2xl font-black transition-colors">&times;</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">이름</label>
            <input type="text" required value={customerData.name} onChange={e => onChange({ ...customerData, name: e.target.value })} className={commonInputClass} placeholder="고객 이름" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">연락처</label>
            <input
              type="tel"
              value={customerData.phone}
              onChange={e => onChange({ ...customerData, phone: formatPhoneNumber(e.target.value) })}
              maxLength={13}
              className={commonInputClass}
              placeholder="연락처 (자동 하이픈 입력)"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">성별</label>
            <select value={customerData.gender} onChange={e => onChange({ ...customerData, gender: e.target.value })} className={commonInputClass} style={{ textAlignLast: 'center' }}>
              <option value="" disabled hidden>선택</option>
              <option value="남">남성</option>
              <option value="여">여성</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">사용 손</label>
            <select value={customerData.hand} onChange={e => onChange({ ...customerData, hand: e.target.value })} className={commonInputClass} style={{ textAlignLast: 'center' }}>
              <option value="" disabled hidden>선택</option>
              <option value="오른손">오른손</option>
              <option value="왼손">왼손</option>
            </select>
          </div>

            <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">투구 스타일 (구질)</label>
            <select value={customerData.style} onChange={e => onChange({ ...customerData, style: e.target.value })} className={commonInputClass} style={{ textAlignLast: 'center' }}>
              <option value="" disabled hidden>선택</option>
              <option value="스트로커">스트로커</option>
              <option value="트위너">트위너</option>
              <option value="크랭커">크랭커</option>
              <option value="덤리스">덤리스</option>
              <option value="투핸드">투핸드</option>
            </select>
          </div>
          </div>

          <button type="submit" className="w-full py-4 mt-8 bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-black text-lg rounded-xl shadow-md border border-indigo-700 border-b-[4px] active:border-b-[1px] active:translate-y-[3px] transition-all">
            {editId ? '정보 수정하기' : '고객 등록 완료'}
          </button>
        </form>
      </div>
    </div>
  );
}
