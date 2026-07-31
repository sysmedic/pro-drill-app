import { useState, useCallback, useEffect } from 'react';
import CustomerManager from './pages/CustomerManager.jsx';
import ChartDetail from './pages/ChartDetail.jsx';
import { FeedbackToast } from './components/ui/Dialogs.jsx'; 
import AppLocker from './AppLocker.jsx'; // 🔒 사생활 보호 게이트키퍼 컴포넌트
import LoginGate from './components/auth/LoginGate.jsx'; // 🔑 로그인 의무 게이트 수입
import useAppSession from './useAppSession.js'; // 🌟 신설된 세션 커스텀 훅 수입
import { autoSyncOnLaunch, registerVisibilitySync } from './lib/syncService.js'; // ☁️ 자동 동기화 허브 임포트
import { initFirstLaunchTime, calculateGracePeriod, certifyUserEmail } from './lib/userLicenseManager.js';

// 📍 오프라인 수동 잠금 제어를 위해 락 기능 브릿징 유지
import useGlobalNfcRead from './hooks/useGlobalNfcRead.js'; 

export default function App() {
  // 1. 순수한 UI 네비게이션 및 잠금 제어 상태만 깔끔하게 잔존
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedChartId, setSelectedChartId] = useState(null); 
  const [isAppLocked, setIsAppLocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('drilling_app_pin_code');
  });
  const [feedback, setFeedback] = useState(null); 

  // 🟢 [라이선스 보안 제어 상태 선언]
  const [graceInfo, setGraceInfo] = useState(() => calculateGracePeriod());
  const [showLicenseGate, setShowLicenseGate] = useState(false);
  const [licenseChecking, setLicenseChecking] = useState(false);
  const [licenseError, setLicenseError] = useState('');
  // 2. 수백 줄의 복잡한 백엔드 세션 통신 로직을 단 한 줄로 완벽 수령
  const session = useAppSession();

  // 🟢 [초고속 워프 스캔 가동] 공을 대면 고객 정보 조회 후 상세창으로 강제 점프 (원본 유지)
  const { handleGlobalNfcRead } = useGlobalNfcRead({
    setFeedback,
    onWalletJump: useCallback((customerData, chartId) => { 
      setSelectedCustomer(customerData); 
      setSelectedChartId(chartId); 
    }, [])
  });

  // 리액트 훅 규칙 준수를 위해 인라인 훅을 최상단 안정 권역으로 정상 격상 처리 (원본 유지)
  const handleTriggerLock = useCallback(() => {
    setIsAppLocked(true);
  }, []);

  // 🔒 앱 내 빈 화면/바탕화면 전역 3회 연속 클릭 시 화면 잠그기 실행 핸들러
  useEffect(() => {
    let clickCount = 0;
    let lastClickTime = 0;

    const handleGlobalBackgroundClick = (e) => {
      // 🤖 E2E 자동화 테스트 환경에서는 락 오작동 및 포커싱 버블링 간섭을 막기 위해 감지를 우회함
      if (navigator.webdriver || window.isPlaywright) {
        return;
      }
      // 🔒 사용자가 설정에서 화면잠금 기능을 비활성화한 경우 잠금 트리거 차단
      const isLockTriggerEnabled = localStorage.getItem('drilling_lock_trigger_enabled') !== 'false';
      if (!isLockTriggerEnabled) {
        return;
      }
      const targetTagName = e.target.tagName.toLowerCase();

      // 버튼, 입력창, 링크, 선택창, 다이얼로그, 메모 핀 등 상호작용 가능한 요소는 카운트 제외 및 초기화
      if (
        targetTagName === 'button' ||
        targetTagName === 'input' ||
        targetTagName === 'textarea' ||
        targetTagName === 'select' ||
        targetTagName === 'a' ||
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('textarea') ||
        e.target.closest('select') ||
        e.target.closest('a') ||
        e.target.closest('.modal-content') ||
        e.target.closest('[role="dialog"]') ||
        e.target.closest('.memo-pin') ||
        e.target.closest('.interactive-chart-element')
      ) {
        clickCount = 0;
        return;
      }

      const now = new Date().getTime();
      if (now - lastClickTime < 350) {
        clickCount += 1;
        if (clickCount >= 3) {
          clickCount = 0;
          lastClickTime = 0;
          handleTriggerLock();
        } else {
          lastClickTime = now;
        }
      } else {
        clickCount = 1;
        lastClickTime = now;
      }
    };

    document.addEventListener('click', handleGlobalBackgroundClick);
    return () => {
      document.removeEventListener('click', handleGlobalBackgroundClick);
    };
  }, [handleTriggerLock]);

  // 🌟 [라이선스 및 자동 동기화 라이프사이클]: 최초 마운트 시 기동일 체크 및 동기화 기동
  useEffect(() => {
    initFirstLaunchTime();
    const info = calculateGracePeriod();
    setGraceInfo(info);

    autoSyncOnLaunch(setFeedback);
    const unregister = registerVisibilitySync();
    return () => {
      if (typeof unregister === 'function') unregister();
    };
  }, [setFeedback]);

  // 인증 확인 중 화면 제어
  if (session.isAuthChecking) return <div className="flex min-h-screen items-center justify-center bg-slate-200 font-bold">인증 확인 중...</div>;

  // 무인증 로컬 진입이므로 로그인 화면 분기 생략

  // 비로그인 시 구글 로그인 폼 안내 제어

  // 🟢 구글 화이트리스트 로그인 연동 검증
  const handleLicenseGateVerify = async () => {
    setLicenseChecking(true);
    setLicenseError('');
    try {
      const { initGoogleApi, signInGoogle, getGoogleUserEmail } = await import('./lib/googleDriveBackup.js');
      await initGoogleApi();
      await signInGoogle(true);
      const email = await getGoogleUserEmail();
      
      if (!email) {
        setLicenseError('구글 계정으로부터 이메일 정보를 읽어올 수 없습니다.');
        setLicenseChecking(false);
        return;
      }
      
      const success = await certifyUserEmail(email);
      if (success) {
        setFeedback({ message: '정식 지공사 라이선스 인증이 완료되었습니다!', tone: 'success' });
        const updatedInfo = calculateGracePeriod();
        setGraceInfo(updatedInfo);
        setShowLicenseGate(false);
        
        // 인증에 성공하면 클라우드 동기화 즉시 재시작
        autoSyncOnLaunch(setFeedback);
      } else {
        setLicenseError(
          <span>
            허용되지 않은 계정입니다: ({email})<br />
            정식 등록된 Gmail로 로그인하시거나, <span className="block mt-1"><a href="mailto:sysmedic@gmail.com" className="text-indigo-600 hover:text-indigo-800 underline font-black">관리자 등록 문의 (sysmedic@gmail.com)</a></span>
          </span>
        );
      }
    } catch (err) {
      console.error("게이트 인증 오류:", err);
      if (err.message === 'REQUIRED_SCOPES_MISSING') {
        setLicenseError('구글 로그인 동의 화면에서 [Google 드라이브 권한] 체크박스를 반드시 직접 체크(허용)해 주셔야 라이선스 인증 연동이 가능합니다.');
      } else {
        setLicenseError('구글 로그인 연동 중 오류가 발생했습니다. 네트워크 상태를 확인해 주세요.');
      }
    } finally {
      setLicenseChecking(false);
    }
  };

  return (
    <div className="bg-slate-200 min-h-screen w-full relative">
      {/* 🔒 90일 유예 기간 만료 시 전면 강제 차단 화면 렌더링 */}
      {showLicenseGate ? (
        <div className="fixed inset-0 z-[11000] bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-800 animate-fade-in">
            <span className="text-5xl block mb-4">⚙️</span>
            <h2 className="text-xl font-black text-slate-800 mb-2">ProDrill 라이선스 만료</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              90일 무료 사용 유예 기간이 완료되었습니다.<br />
              지속적인 지공 차트 기록 및 안전한 백업을 위해 정식 등록된 구글 계정으로 연동 인증을 완료해 주세요.
            </p>
            
            {licenseError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-left text-xs font-bold text-red-600 leading-snug">
                {licenseError}
              </div>
            )}
            
            <button
              onClick={handleLicenseGateVerify}
              disabled={licenseChecking}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-3.5 rounded-xl text-sm font-extrabold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {licenseChecking ? '구글 로그인 인증 중...' : '🔑 구글 이메일 인증하기'}
            </button>
          </div>
        </div>
      ) : (
        /* 기존 하위 컴포넌트 매핑 구역 */
        !selectedCustomer ? (
          <CustomerManager 
            onSelectCustomer={setSelectedCustomer}
            onLogout={handleTriggerLock}
            onNfcScan={handleGlobalNfcRead} 
            graceInfo={graceInfo}
            userTier={session.userTier}
          />
        ) : (
          <ChartDetail
            customer={selectedCustomer}
            initialChartId={selectedChartId} 
            onBack={() => { setSelectedCustomer(null); setSelectedChartId(null); }} 
            maxChartsAllowed={session.maxChartsAllowed}
            currentChartsCount={session.currentChartsCount}
            userTier={session.userTier}
            refreshChartCount={() => session.refreshChartCount(session.user.uid)}
            onTriggerLock={handleTriggerLock} 
          />
        )
      )}

      {/* 🌟 [오류 완치] */}
      <div className="fixed inset-0 pointer-events-none z-[10000]">
        <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} title={feedback?.title} tone={feedback?.tone} />
      </div>

      {/* 🔒 가역적 킬스위치 원격 강제 잠금 오버레이 */}
      {session.userTier === 'locked' && (
        <div className="fixed inset-0 z-[12000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 select-none">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 animate-fade-in">
            <span className="text-5xl block mb-4">{"\uD83D\uDEA8"}</span>
            <h2 className="text-xl font-black text-slate-800 mb-2">ProDrill 앱 잠금 알림</h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed text-left sm:text-center">
              본 기기의 라이선스가 **원격 잠금(임시 정지)** 상태로 전환되었습니다.<br /><br />
              기존 지공 차트 및 고객 정보는 유실 없이 안전하게 보존되어 있으며, 잠금 해제를 원하실 경우 마스터 관리자에게 문의해 주세요.
            </p>
            <div className="text-[10px] text-slate-400 font-mono">
              Status: LOCKED (Kill Switch Active)
            </div>
          </div>
        </div>
      )}

      {/* 🔑 최초 가동 시 구글 로그인 의무 확인 게이트 */}
      {session.isFirstTimeSetup && (
        <LoginGate 
          onSuccess={session.authenticateSession} 
          onFeedback={setFeedback} 
        />
      )}

      {/* 🔒 사생활 보호 게이트키퍼 컴포넌트 */}
      <AppLocker 
        isAppLocked={isAppLocked} 
        setIsAppLocked={setIsAppLocked} 
        setFeedback={setFeedback} 
      />
    </div>
  );
}