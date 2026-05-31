import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, 
  collection, query, where, getCountFromServer 
} from 'firebase/firestore'; 
import { auth, db } from './firebase'; 
import { getDeviceId } from './lib/device';

const ADMIN_EMAILS = ["sysmedic@gmail.com"]; 

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

export default function useAppSession() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authErrorMsg, setAuthErrorMsg] = useState("");
  const [userTier, setUserTier] = useState("trial_beta");
  const [maxChartsAllowed, setMaxChartsAllowed] = useState(100);
  const [currentChartsCount, setCurrentChartsCount] = useState(0);

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

  // 인증 및 등급 확인 로직 전체 이사
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

  return {
    user,
    isAuthChecking,
    authErrorMsg,
    userTier,
    maxChartsAllowed,
    currentChartsCount,
    isAdmin,
    refreshChartCount
  };
}