import Button from '../../components/ui/Button.jsx';
import Field from '../../components/ui/Field.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';

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

export default function CustomerFormModal({ customerData, editId, onChange, onClose, onSubmit }) {
  
  // 등록일 포맷팅 로직
  let displayDate = '';
  if (customerData.createdAt && typeof customerData.createdAt.toDate === 'function') {
    const d = customerData.createdAt.toDate();
    displayDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } else {
    const today = new Date();
    displayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  return (
    <ModalShell
      align="bottom"
      // 스크롤 해결 유지
      bodyClassName="p-6 sm:p-8 max-h-[calc(100vh-120px)] overflow-y-auto"
      initialFocusSelector="input:not([readonly])"
      onClose={onClose}
      size="xl"
      title={editId ? '고객 정보 수정' : '신규 고객 등록'}
      titleId="customer-modal-title"
      variant="light"
    >
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* 📍 1. 등록일: 음영(bg-slate-50)을 bg-transparent로 변경하여 완벽히 제거 */}
          <Field
            label="등록일"
            type="text"
            value={displayDate}
            readOnly
            tabIndex="-1"
            className="bg-transparent text-slate-500 cursor-default font-medium outline-none border-slate-200 pointer-events-none text-left shadow-none"
          />

          {/* 2. 이름 */}
          <Field
            label="이름"
            onChange={e => onChange({ ...customerData, name: e.target.value })}
            placeholder="고객 이름"
            required
            type="text"
            value={customerData.name}
          />

          {/* 3. 상주 볼링장 / 클럽 */}
          <Field
            label="상주 볼링장 / 클럽"
            onChange={e => onChange({ ...customerData, club: e.target.value })}
            placeholder="예: 프로볼링장 / 텐핀클럽"
            type="text"
            value={customerData.club || ''}
          />

          {/* 4. 연락처 */}
          <Field
            label="연락처"
            maxLength={13}
            onChange={e => onChange({ ...customerData, phone: formatPhoneNumber(e.target.value) })}
            placeholder="연락처 (자동 하이픈 입력)"
            type="tel"
            value={customerData.phone}
          />

          {/* 5. 성별 */}
          <Field
            as="select"
            label="성별"
            onChange={e => onChange({ ...customerData, gender: e.target.value })}
            style={{ textAlignLast: 'center' }}
            value={customerData.gender}
          >
            <option value="" disabled hidden>선택</option>
            <option value="남">남성</option>
            <option value="여">여성</option>
          </Field>

          {/* 6. 사용 손 */}
          <Field
            as="select"
            label="사용 손"
            onChange={e => onChange({ ...customerData, hand: e.target.value })}
            style={{ textAlignLast: 'center' }}
            value={customerData.hand}
          >
            <option value="" disabled hidden>선택</option>
            <option value="오른손">오른손</option>
            <option value="왼손">왼손</option>
          </Field>

          {/* 7. 투구 스타일 (구질) */}
          <Field
            as="select"
            label="투구 스타일 (구질)"
            onChange={e => onChange({ ...customerData, style: e.target.value })}
            style={{ textAlignLast: 'center' }}
            value={customerData.style}
          >
            <option value="" disabled hidden>선택</option>
            <option value="아대 스트로커">아대 스트로커</option>
            <option value="스트로커">스트로커</option>
            <option value="트위너">트위너</option>
            <option value="크랭커">크랭커</option>
            <option value="덤리스">덤리스</option>
            <option value="투핸드">투핸드</option>
          </Field>

          {/* 8. 투구 스타일 (추가) */}
          <Field
            as="select"
            label="투구 스타일 (추가)"
            onChange={e => onChange({ ...customerData, styleExtra: e.target.value })}
            style={{ textAlignLast: 'center' }}
            value={customerData.styleExtra || ''}
          >
            <option value="">선택 안함</option>
            <option value="아대 스트로커">아대 스트로커</option>
            <option value="스트로커">스트로커</option>
            <option value="트위너">트위너</option>
            <option value="크랭커">크랭커</option>
            <option value="덤리스">덤리스</option>
            <option value="투핸드">투핸드</option>
          </Field>
          
        </div>

        <Button className="w-full mt-8" size="lg" type="submit" variant="primary">
          {editId ? '정보 수정하기' : '고객 등록 완료'}
        </Button>
      </form>
    </ModalShell>
  );
}