import { useState, useEffect } from 'react';
import CustomerManager from './pages/CustomerManager.jsx';
import ChartDetail from './pages/ChartDetail.jsx';
import AdminPage from './pages/chartDetail/AdminPage.jsx';

import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore'; 
import { auth, db, googleProvider } from './firebase'; 
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { getDeviceId } from './lib/device';

export default function App() {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authErrorMsg, setAuthErrorMsg] = useState("");
  const [showAdminPage, setShowAdminPage] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const ADMIN_EMAILS = ["sysmedic@gmail.com"]; 
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
  // 🛡️ [안전장치] 3초가 지나도 응답 없으면 강제로 화면을 띄움
  const forceShow = setTimeout(() => {
    setIsAuthChecking(false);
  }, 3000);

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    clearTimeout(forceShow); // 파이어베이스 응답이 오면 타이머 해제
    
    try {
      if (currentUser) {
        // Phase 4: 기기 체크 로직 시작
        const deviceId = getDeviceId();
        const userRef = doc(db, 'users', currentUser.email);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const { activeDevices = [], maxDevices = 1 } = userData;

          // 관리자 프리패스
          if (ADMIN_EMAILS.includes(currentUser.email)) {
            setUser(currentUser);
          } else {
            const isKnown = activeDevices.includes(deviceId);
            if (!isKnown && activeDevices.length >= maxDevices) {
              setAuthErrorMsg("기기 제한 초과");
              await signOut(auth);
            } else {
              if (!isKnown) await updateDoc(userRef, { activeDevices: arrayUnion(deviceId) });
              setUser(currentUser);
            }
          }
        } else {
          // 신규 유저 로직...
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("인증 처리 중 에러:", error);
      // 에러가 나도 일단 넘어가게 함 (다시 로그인 시도 가능하게)
    } finally {
      // 🔥 [핵심] 어떤 경우에도 로딩 화면은 무조건 종료
      setIsAuthChecking(false);
    }
  });

  return () => { unsubscribe(); clearTimeout(forceShow); };
}, []);

  if (isAuthChecking) return <div className="flex min-h-screen items-center justify-center bg-slate-200">인증 확인 중...</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-200 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-6">Drilling Support</h1>
          {authErrorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 whitespace-pre-wrap">{authErrorMsg}</div>}
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold w-full">구글 계정으로 시작하기</button>
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
        />
      ) : (
        <ChartDetail customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />
      )}
    </div>
  );
}