import { useState, useEffect, useCallback } from 'react';
import CustomerManager from './pages/CustomerManager.jsx';
import ChartDetail from './pages/ChartDetail.jsx';
import AdminPage from './pages/chartDetail/AdminPage.jsx';
import { FeedbackToast } from './components/ui/Dialogs.jsx'; // 🟢 글로벌 알림 토스트 수입

// 📍 Firebase 도구들 정리
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, 
  collection, query, where, getCountFromServer 
} from 'firebase/firestore'; 
import { auth, db, googleProvider } from './firebase'; 
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getDeviceId } from './lib/device';
import useGlobalNfcRead from './hooks/useGlobalNfcRead.js'; // 🟢 글로벌 NFC 리더 훅 수입

// 회원 등급별 최대 허용 갯수 정의
const getMaxChartsAllowed = (tier) => {
  switch (tier) {
    case 'trial_beta':
    case 'beta':
    case 'standard': return 100;
    case 'pro': return 500;
    case 'expert':
    case 'master': return Infinity;
    default: return 100;
  }
};

export default function App() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authErrorMsg, setAuthErrorMsg] = useState("");
  
  // 📍 등급 및 카운트 상태 관리
  const [userTier, setUserTier] = useState("trial_beta");
  const [maxChartsAllowed, setMaxChartsAllowed] = useState(100);
  const [currentChartsCount, setCurrentChartsCount] = useState(0);

  const [showAdminPage, setShowAdminPage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // 🟢 메인화면용 알림 피드백 상태 추가

  const ADMIN_EMAILS = ["sysmedic@gmail.com"]; 
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  // 실시간 차트 카운트 함수
  const refreshChartCount = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const chartsRef = collection(db, 'drilling_charts');
      const q = query(chartsRef, where('userId', '==', uid));
      const snapshot = await getCountFromServer(q);
      setCurrentChartsCount(snapshot.data().count);
      console.log("📊 현재 전체 차트 수:", snapshot.data().count);
    } catch (error) {
      console.error("카운트 조회 에러:", error);
    }
  }, []);

  // 🟢 [초고속 워프 스캔 가동] 공을 대면 고객 정보 조회 후 상세창으로 강제 점프
  const { handleGlobalNfcRead } = useGlobalNfcRead({
    setFeedback,
    onWalletJump: useCallback((customerData) => {
      setSelectedCustomer(customerData); // 🚀 고객 상태를 변경하여 지공 상세 화면으로 즉시 전환!
    }, [])
  });

  // 인증 및 등급 확인 로직
  useEffect(() => {
    const forceShow = setTimeout(() => { setIsAuthChecking(false); }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(forceShow);
      try {
        if (currentUser) {
          const deviceId = getDeviceId();
          const userRef = doc(db, 'users', currentUser.email);
          const userSnap = await getDoc(userRef);

          let currentTier = "trial_beta";

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const { activeDevices = [], maxDevices = 1 } = userData;
            currentTier = userData.tier || "trial_beta";

            if (!ADMIN_EMAILS.includes(currentUser.email)) {
              const isKnown = activeDevices.includes(deviceId);
              if (!isKnown && activeDevices.length >= maxDevices) {
                setAuthErrorMsg("기기 제한 초과: 동시에 사용할 수 있는 기기 수를 초과했습니다.");
                await signOut(auth);
                return;
              }
              if (!isKnown) {
                await updateDoc(userRef, { activeDevices: arrayUnion(deviceId) });
              }
            }
            setUser({ ...currentUser, tier: currentTier });
          } else {
            const newUserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || "새로운 볼러",
              tier: "trial_beta",
              status: "active",
              joinedAt: serverTimestamp(),
              maxDevices: 2,
              activeDevices: [deviceId]
            };
            await setDoc(userRef, newUserProfile);
            currentTier = "trial_beta";
            setUser({ ...currentUser, tier: currentTier });
          }

          setUserTier(currentTier);
          setMaxChartsAllowed(getMaxChartsAllowed(currentTier));
          await refreshChartCount(currentUser.uid);

        } else {
          setUser(null);
          setCurrentChartsCount(0);
        }
      } catch (error) {
        console.error("인증 처리 에러:", error);
      } finally {
        setIsAuthChecking(false);
      }
    });

    return () => { unsubscribe(); clearTimeout(forceShow); };
  }, [refreshChartCount]);

  if (isAuthChecking) return <div className="flex min-h-screen items-center justify-center bg-slate-200 font-bold">인증 확인 중...</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-6 italic">Drilling Support</h1>
          {authErrorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 whitespace-pre-wrap font-medium">{authErrorMsg}</div>}
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold w-full active:scale-95 transition-transform">구글 계정으로 시작하기</button>
        </div>
      </div>
    );
  }

  if (showAdminPage && isAdmin) return <AdminPage onBack={() => setShowAdminPage(false)} />;

  return (
    <div className="bg-slate-200 min-h-screen w-full relative">
      {!selectedCustomer ? (
        <CustomerManager 
          isAdmin={isAdmin}
          onOpenAdmin={() => setShowAdminPage(true)}
          onSelectCustomer={setSelectedCustomer}
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          onLogout={() => signOut(auth)}
          onNfcScan={handleGlobalNfcRead} // 🟢 📟 메인 매니저에 NFC 스캔 전송!
        />
      ) : (
        <ChartDetail
          customer={selectedCustomer}
          onBack={() => setSelectedCustomer(null)}
          maxChartsAllowed={maxChartsAllowed}
          currentChartsCount={currentChartsCount}
          userTier={userTier}
          refreshChartCount={() => refreshChartCount(user.uid)}
        />
      )}

      {/* 🟢 메인 화면용 피드백 토스트 배치 */}
      <FeedbackToast message={feedback?.message} onDismiss={() => setFeedback(null)} title={feedback?.title} tone={feedback?.tone} />
    </div>
  );
}