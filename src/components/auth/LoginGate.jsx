import { useState, useEffect } from 'react';
import { initGoogleApi, signInGoogle, getGoogleUserEmail } from '../../lib/googleDriveBackup.js';
import Button from '../ui/Button.jsx';

export default function LoginGate({ onSuccess, onFeedback }) {
  const [loading, setLoading] = useState(false);

  // ⚡ iOS 사파리 팝업 차단 우회를 위해 마운트 즉시 구글 API 사전 초기화(Pre-load)
  useEffect(() => {
    initGoogleApi().catch((e) => {
      console.warn("구글 API 사전 초기화 실패 (비로그인 상태 등):", e);
    });
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // 1. Google API 초기화 (이미 완료되었으면 즉각 바이패스)
      await initGoogleApi();
      
      // 2. 구글 OAuth 로그인 팝업 트리거 (isLoginGateOnly = true 지정하여 403 차단 우회)
      await signInGoogle(true, true);
      
      // 3. 로그인된 사용자 이메일 획득
      const email = await getGoogleUserEmail();
      if (!email) {
        throw new Error('이메일 정보를 가져올 수 없습니다.');
      }
      
      // 4. 성공 콜백 전파
      await onSuccess(email);
    } catch (error) {
      console.error("최초 로그인 게이트 에러:", error);
      let errorMsg = '구글 로그인 중 오류가 발생했습니다. 네트워크 상태를 확인하세요.';
      
      if (error.message === 'GOOGLE_API_KEYS_MISSING') {
        errorMsg = '구글 API 키 설정이 누락되었습니다. 개발자 환경 변수를 설정해 주세요.';
      } else if (error.message === 'NETWORK_OFFLINE') {
        errorMsg = '네트워크 연결이 끊겨 오프라인 상태입니다. 온라인으로 연결해 주세요.';
      } else if (error.error === 'popup_closed_by_user') {
        errorMsg = '사용자가 로그인 팝업창을 닫았습니다.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      onFeedback({ message: errorMsg, tone: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 animate-fade-in space-y-6">
        
        {/* 앱 로고 / 아이콘 공간 */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
            {"\uD83D\uDD11"}
          </div>
        </div>

        {/* 텍스트 내용 */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800">ProDrill 계정 확인</h2>
          <p className="text-xs text-slate-500 leading-relaxed text-left sm:text-center px-1">
            ProDrill은 개인 구글 드라이브 연동을 통해 지공 차트를 안전하게 보관할 수 있는 PWA 앱입니다. 
            정확한 가동 통계 집계를 위해 최초 1회 구글 로그인이 요구됩니다.
          </p>
        </div>

        {/* 로그인 액션 */}
        <div className="pt-2">
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="primary"
            className="w-full py-3 text-sm font-black flex items-center justify-center gap-2 rounded-xl transition-all shadow-md active:scale-95"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-1">{"\u23F3"}</span>
            ) : (
              <span className="text-base">{"\u2601\uFE0F"}</span>
            )}
            구글 계정으로 시작하기
          </Button>
        </div>

        {/* 하단 브랜드 태그 */}
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          ProDrill Verification Gate
        </div>
      </div>
    </div>
  );
}
