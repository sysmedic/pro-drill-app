import { useState, useCallback } from 'react';
import CustomerManager from './pages/CustomerManager.jsx';
import ChartDetail from './pages/ChartDetail.jsx';
import AdminPage from './pages/chartDetail/AdminPage.jsx';
import { FeedbackToast } from './components/ui/Dialogs.jsx'; 
import AppLocker from './AppLocker.jsx'; // 🔒 사생활 보호 게이트키퍼 컴포넌트
import useAppSession from './useAppSession.js'; // 🌟 신설된 세션 커스텀 훅 수입

// 📍 최소한의 로그인 구동 도구만 유지
import { auth, googleProvider } from './firebase'; 
import { signInWithPopup, signOut } from 'firebase/auth';
import useGlobalNfcRead from './hooks/useGlobalNfcRead.js'; 

export default function App() {
  // 1. 순수한 UI 네비게이션 및 잠금 제어 상태만 깔끔하게 잔존
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedChartId, setSelectedChartId] = useState(null); 
  const [isAppLocked, setIsAppLocked] = useState(true);
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); 

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

  // 인증 확인 중 화면 제어
  if (session.isAuthChecking) return <div className="flex min-h-screen items-center justify-center bg-slate-200 font-bold">인증 확인 중...</div>;

  // 비로그인 시 구글 로그인 폼 안내 제어
  if (!session.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-6 italic">Drilling Support</h1>
          {session.authErrorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 whitespace-pre-wrap font-medium">{session.authErrorMsg}</div>}
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold w-full active:scale-95 transition-transform">구글 계정으로 시작하기</button>
        </div>
      </div>
    );
  }

  // 관리자 대시보드 강제 라우팅 제어
  if (showAdminPage && session.isAdmin) return <AdminPage onBack={() => setShowAdminPage(false)} />;

  return (
    <div className="bg-slate-200 min-h-screen w-full relative">
      {/* 기존 하위 컴포넌트 매핑 구역: session 내부 데이터로 완벽하고 안전하게 브릿징 연결 */}
      {!selectedCustomer ? (
        <CustomerManager 
          isAdmin={session.isAdmin}
          onOpenAdmin={() => setShowAdminPage(true)}
          onSelectCustomer={setSelectedCustomer}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          onLogout={() => signOut(auth)}
          onNfcScan={handleGlobalNfcRead} 
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

      {/* 🌟 [오류 완치]: 어떤 화면이나 잠금창 자식 요소에도 절대 파묻히지 않도록 최상위 z-[10000] 격벽 레이어를 확실하게 복귀시켰습니다. */}
      <div className="fixed inset-0 pointer-events-none z-[10000]">
        <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} title={feedback?.title} tone={feedback?.tone} />
      </div>

      {/* 🔒 사생활 보호 게이트키퍼 컴포넌트 */}
      <AppLocker 
        isAppLocked={isAppLocked} 
        setIsAppLocked={setIsAppLocked} 
        setFeedback={setFeedback} 
      />
    </div>
  );
}