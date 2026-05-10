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
  return (
    <ModalShell
      align="bottom"
      bodyClassName="p-6 sm:p-8"
      initialFocusSelector="input"
      onClose={onClose}
      size="xl"
      title={editId ? '고객 정보 수정' : '신규 고객 등록'}
      titleId="customer-modal-title"
      variant="light"
    >
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="이름"
            onChange={e => onChange({ ...customerData, name: e.target.value })}
            placeholder="고객 이름"
            required
            type="text"
            value={customerData.name}
          />

          <Field
            label="연락처"
            maxLength={13}
            onChange={e => onChange({ ...customerData, phone: formatPhoneNumber(e.target.value) })}
            placeholder="연락처 (자동 하이픈 입력)"
            type="tel"
            value={customerData.phone}
          />

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

          <Field
            as="select"
            label="투구 스타일 (구질)"
            onChange={e => onChange({ ...customerData, style: e.target.value })}
            style={{ textAlignLast: 'center' }}
            value={customerData.style}
          >
            <option value="" disabled hidden>선택</option>
            <option value="스트로커">스트로커</option>
            <option value="트위너">트위너</option>
            <option value="크랭커">크랭커</option>
            <option value="덤리스">덤리스</option>
            <option value="투핸드">투핸드</option>
          </Field>

          <Field
            as="select"
            label="투구 스타일 (추가)"
            onChange={e => onChange({ ...customerData, style2: e.target.value })}
            style={{ textAlignLast: 'center' }}
            value={customerData.style2 || ''}
          >
            <option value="">선택 안함</option>
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
