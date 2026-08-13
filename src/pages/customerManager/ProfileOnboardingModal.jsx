import React, { useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import ModalShell from '../../components/ui/ModalShell.jsx';
import { sanitizeString } from '../../lib/userLicenseManager.js';

export default function ProfileOnboardingModal({ isOpen, email, onSave, onFeedback }) {
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanName = sanitizeString(name, 15);
    const cleanShop = sanitizeString(shopName, 30);
    const cleanPhone = sanitizeString(phone, 20);

    if (!cleanName) {
      if (onFeedback) {
        onFeedback({ message: '지공사 성함을 정확히 입력해 주세요.', tone: 'warning' });
      }
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: cleanName,
        shopName: cleanShop,
        phone: cleanPhone
      });
    } catch (err) {
      console.error("프로필 등록 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={() => {}} size="sm" title="지공사 프로필 등록 (최초 1회)">
      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
        
        {/* 1. 개인정보 보호 & 입력 목적 안내 박스 */}
        <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 space-y-2 text-xs leading-relaxed text-indigo-950">
          <div className="flex items-center gap-2 font-black text-indigo-900 text-sm">
            <span>{"\uD83D\uDD10"}</span>
            <span>라이선스 관리 및 보안 안내</span>
          </div>
          <p className="font-bold">
            본 정보 입력은 <span className="underline decoration-indigo-300 font-black">라이선스 관리와 무자격 사용자를 필터링하기 위한 목적</span>입니다.
          </p>
          <p className="text-indigo-800 font-medium">
            입력하신 정보는 즉시 암호화 처리되어 개인정보 유출 및 도용으로부터 안전하게 보호됩니다.
          </p>
        </div>

        {/* 2. 연동 이메일 안내 */}
        <div className="bg-slate-100/80 px-3.5 py-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-500">인증 구글 계정</span>
          <span className="font-black text-slate-800">{email}</span>
        </div>

        {/* 3. 프로필 입력 필드 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="onboarding-name-input" className="block text-xs font-black text-slate-700 mb-1.5">
              지공사 성함 <span className="text-rose-500">*</span>
            </label>
            <input
              id="onboarding-name-input"
              type="text"
              required
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="onboarding-shop-input" className="block text-xs font-black text-slate-700 mb-1.5">
              지공 샵
            </label>
            <input
              id="onboarding-shop-input"
              type="text"
              placeholder="예: 서울 붐볼링 지공 샵"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="onboarding-phone-input" className="block text-xs font-black text-slate-700 mb-1.5">
              연락처 / 매장 번호 <span className="text-slate-400 font-normal">(선택)</span>
            </label>
            <input
              id="onboarding-phone-input"
              type="tel"
              placeholder="예: 010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* 4. 허위 정보 경고 & 제재 안내 박스 */}
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 text-amber-950 text-[11px] leading-relaxed space-y-1">
          <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs">
            <span>{"\u26A0\uFE0F"}</span>
            <span>올바른 정보 기재 및 제재 관련 주의사항</span>
          </div>
          <p className="font-bold text-amber-900">
            정확한 지공사 성함과 지공 샵 명칭을 입력해 주세요.
          </p>
          <p className="text-amber-800">
            타인의 명의를 무단 도용하거나 허위 정보를 기재할 경우, 사전 통보 없이 서비스 이용에 제재(계정 잠금 및 서비스 이용 정지)를 받을 수 있습니다.
          </p>
        </div>

        {/* 5. 제출 버튼 */}
        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading || !name.trim()}
            variant="primary"
            className="w-full py-3 text-sm font-black shadow-md shadow-indigo-100"
          >
            {loading ? '프로필 동기화 중...' : '프로필 저장 및 ProDrill 시작'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
