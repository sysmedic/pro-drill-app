import { useState, useCallback, useRef } from 'react';
import { ConfirmModal } from './components/ui/Dialogs.jsx'; // 앱 표준 컨펌 모달 수입
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

export default function AppLocker({ isAppLocked, setIsAppLocked, setFeedback }) {
  const [pinInput, setPinInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetClickRef = useRef({ count: 0, lastClick: 0 });

  // 비밀번호 입력 및 영구 검증 제어 엔진
  const handlePinKeyPress = useCallback((digit) => {
    if (pinInput.length >= 4) return;
    const nextInput = pinInput + digit;
    setPinInput(nextInput);

    if (nextInput.length === 4) {
      const savedPin = localStorage.getItem('drilling_app_pin_code');
      
      if (!savedPin) {
        // 1) 기기에 암호가 없는 상태에서 진입 시 -> 최초 비밀번호로 영구 등록 처리
        localStorage.setItem('drilling_app_pin_code', nextInput);
        setFeedback({ message: '🔒 초기 사생활 보호 비밀번호가 안전하게 설정되었습니다!', tone: 'success' });
        setIsAppLocked(false);
        setPinInput('');
      } else if (savedPin === nextInput) {
        // 2) 암호 일치 시 잠금 해제
        setIsAppLocked(false); 
        setPinInput('');
      } else {
        // 3) 실패 시 리셋 및 진동 피드백
        setFeedback({ message: '❌ 비밀번호가 일치하지 않습니다. 다시 시도해 주세요.', tone: 'danger' });
        setPinInput('');
        if (navigator.vibrate) navigator.vibrate(200);
      }
    }
  }, [pinInput, setIsAppLocked, setFeedback]);

  // 0 왼쪽 투명 버튼을 3번 연속 클릭했을 때 발동하는 히든 리셋 스위치
  const handleResetTripleClick = useCallback(() => {
    const now = Date.now();
    const { count, lastClick } = resetClickRef.current;

    if (now - lastClick < 350) { 
      const nextCount = count + 1;
      if (nextCount >= 3) {
        resetClickRef.current = { count: 0, lastClick: 0 };
        setShowResetConfirm(true); // 앱 표준 모달 팝업 가동
      } else {
        resetClickRef.current = { count: nextCount, lastClick: now };
      }
    } else {
      resetClickRef.current = { count: 1, lastClick: now };
    }
  }, []);

  // 잠금이 해제된 상태라면 화면에 아무것도 그리지 않고 투명하게 관통시킵니다.
  if (!isAppLocked) return null;

  return (
    /* 🌟 [오류 완치]: 상단 메뉴 바가 절대 삐져나오지 못하도록 z-[9999] 바리케이드를 완전히 견고하게 복구합니다. */
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white select-none animate-fade-in touch-none">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🔒</div>
        <h2 className="text-xl font-black tracking-tight text-slate-100">
          {localStorage.getItem('drilling_app_pin_code') ? '' : '초기 비밀번호 설정'}
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-1 leading-normal">
          {localStorage.getItem('drilling_app_pin_code') 
            ? '앱을 조작하려면 4자리 암호를 입력하세요.' 
                : '처음 가동되었습니다. 사용할 4자리 숫자를 입력하세요.'}
        </p>
      </div>

      {/* 보안 도트 표시기 */}
      <div className="flex justify-center gap-4 mb-10">
        {[...Array(4)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all duration-150 ${
              i < pinInput.length ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/50' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      {/* 숫자 키패드 격자 */}
      <div className="w-full max-w-[280px] grid grid-cols-3 gap-y-4 gap-x-6 mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handlePinKeyPress(String(num))}
            className="h-16 w-16 text-2xl font-black text-slate-200 bg-slate-900 active:bg-slate-800 border border-slate-800/50 rounded-full flex items-center justify-center transition-colors shadow-sm transform-gpu active:scale-90"
          >
            {num}
          </button>
        ))}
        
        {/* 0 왼쪽 공간 마스터키 트리플 클릭 이스터에그 투명 버튼 */}
        <button
          type="button"
          onClick={handleResetTripleClick}
          className="h-16 w-16 bg-transparent border-0 outline-none select-none cursor-default"
          style={{ WebkitTapHighlightColor: 'transparent' }} 
        />
        
        <button
          type="button"
          onClick={() => handlePinKeyPress('0')}
          className="h-16 w-16 text-2xl font-black text-slate-200 bg-slate-900 active:bg-slate-800 border border-slate-800/50 rounded-full flex items-center justify-center transition-colors shadow-sm transform-gpu active:scale-90"
        >
          0
        </button>
        
        <button
          type="button"
          onClick={() => setPinInput(prev => prev.slice(0, -1))}
          className="h-16 w-16 text-base font-bold text-slate-400 active:text-white rounded-full flex items-center justify-center transition-colors transform-gpu active:scale-90"
        >
          지우기
        </button>
      </div>

      {/* 🌟 [가로채기 기술 적용]: 모달이 활성화되는 순간 body 직속 포탈 레이어를 z-[10000]으로 하이재킹하여 전면에 정렬합니다. */}
      {showResetConfirm && (
        <>
          <style>{`
            body > div.fixed,
            div[role="dialog"],
            .fixed.inset-0.z-50 {
              z-index: 10000 !important;
            }
          `}</style>
          <ConfirmModal
            title="비밀번호 초기화 안내"
            message="비밀번호를 분실하셨나요? 구글 계정으로 다시 로그인하여 본인인증을 완료하면 사생활 암호가 자동으로 초기화됩니다."
            confirmLabel="리셋 진행"
            cancelLabel="취소"
            onConfirm={async () => {
              setShowResetConfirm(false);
              localStorage.removeItem('drilling_app_pin_code'); 
              await signOut(auth); 
              window.location.reload(); 
            }}
            onCancel={() => setShowResetConfirm(false)}
          />
        </>
      )}
    </div>
  );
}