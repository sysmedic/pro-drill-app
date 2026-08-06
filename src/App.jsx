import { useState, useCallback, useEffect } from 'react';
import CustomerManager from './pages/CustomerManager.jsx';
import ChartDetail from './pages/ChartDetail.jsx';
import { FeedbackToast } from './components/ui/Dialogs.jsx'; 
import AppLocker from './AppLocker.jsx'; // 🔒 사생활 보호 게이트키퍼 컴포넌트
import LoginGate from './components/auth/LoginGate.jsx'; // 🔑 로그인 의무 게이트 수입
import useAppSession from './useAppSession.js'; // 🌟 신설된 세션 커스텀 훅 수입
import { autoSyncOnLaunch, registerVisibilitySync } from './lib/syncService.js'; // ☁️ 자동 동기화 허브 임포트
import { initFirstLaunchTime, calculateGracePeriod, isLicenseCertified } from './lib/userLicenseManager.js';

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

  // 🟢 [라이선스 보안 제어 상태 선언]: 앱 실행 시 90일 만료 여부 판단 후 1회 안내 모달 표시
  const [graceInfo, setGraceInfo] = useState(() => calculateGracePeriod());
  const [showLicenseGate, setShowLicenseGate] = useState(() => {
    const info = calculateGracePeriod();
    return info.isExpired && !isLicenseCertified();
  });
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

  // ⚡ PWA Service Worker 구버전 캐시 강제 무효화 및 최신 빌드 자동 교체
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
        }
      });
    }
  }, []);



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
      // 🔒 사용자가 설정에서 화면잠금(차트 가리기) 기능을 활성화했는지 체크
      const isLockTriggerEnabled = localStorage.getItem('drilling_lock_trigger_enabled') !== 'false';
      
      // 🎯 터치한 곳이 "도면 영역"인지 판별
      const isBlueprintArea = !!(e.target.closest && (e.target.closest('.chart-blueprint-container') || e.target.closest('[data-testid="chart-blueprint-canvas"]')));

      // 🛡️ 차트 가리기 설정(isLockTriggerEnabled)에 따른 3연타 잠금 동작 조건:
      // 1. 차트 가리기가 ON (true) 인 경우: 앱 내 모든 빈 공간 3회 클릭 시 화면 잠금 가동!
      // 2. 차트 가리기가 OFF (false) 인 경우: 오직 '도면 영역(isBlueprintArea)' 3회 클릭 시에만 화면 잠금 가동, 나머지는 무시!
      if (!isLockTriggerEnabled && !isBlueprintArea) {
        clickCount = 0;
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



  return (
    <div className="bg-slate-200 min-h-screen w-full relative">
      {/* 📢 90일 무료 트라이얼 만료 안내 모달 (로컬 기능 사용 지장 없음) */}
      {showLicenseGate && (
        <div className="fixed inset-0 z-[11000] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-slate-200 animate-fade-in space-y-4">
            <h2 className="text-xl font-black text-slate-800">ProDrill 트라이얼 만료 안내</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2 text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-800">90일 무료 트라이얼 기간이 만료되었습니다.</p>
              <p>• <strong className="text-emerald-700 font-bold">로컬 차트 관리 및 인쇄</strong>: 제한 없이 계속 이용하실 수 있습니다.</p>
              <p>• <strong className="text-amber-700 font-bold">구글 계정 연동 & 백업</strong>: 트라이얼 만료로 연동이 차단되었습니다. 정식 라이선스 등록 후 이용 가능합니다.</p>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">등록 문의: <a href="mailto:sysmedic@gmail.com" className="text-indigo-600 underline font-bold">sysmedic@gmail.com</a></p>
            </div>

            <button
              type="button"
              onClick={() => setShowLicenseGate(false)}
              className="w-full bg-slate-800 text-white hover:bg-slate-900 py-3.5 rounded-xl text-sm font-extrabold shadow-md transition-all active:scale-[0.98]"
            >
              확인 (로컬 기능 계속 이용하기)
            </button>
          </div>
        </div>
      )}

      {/* 메인 화면 컨텐츠 렌더링 */}
      {!selectedCustomer ? (
        <CustomerManager 
          onSelectCustomer={setSelectedCustomer}
          onLogout={handleTriggerLock}
          onNfcScan={handleGlobalNfcRead} 
          graceInfo={graceInfo}
          userTier={session.userTier}
          certifiedEmailHash={session.certifiedEmailHash}
          activeEmail={session.user?.email}
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
            <h2 className="text-xl font-black text-slate-800 mb-2">ProDrill 계정 잠금 알림</h2>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed text-left sm:text-center font-medium">
              해당 계정은 라이선스가 잠금(차단) 처리되었습니다.<br /><br />
              기존 고객 및 지공 데이터는 사용자 본인의 기기(로컬)에 100% 안전하게 보존되어 있으니 안심하세요.<br /><br />
              라이선스 승인 및 문의: <strong className="text-indigo-600 underline select-all">sysmedic@gmail.com</strong>
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