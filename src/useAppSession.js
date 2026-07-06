import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, 
  collection, query, where, getCountFromServer 
} from 'firebase/firestore'; 
import { auth, db } from './firebase'; 
import { getDeviceId } from './lib/device';
// 🌟 슈파베이스 인프라 및 모드 스위치 수입
import { supabase, dbMode } from './supabaseClient'; 

const ADMIN_EMAILS = ["sysmedic@gmail.com"]; 

// 회원 등급별 최대 허용 갯수 정의 (원본 유지)
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

  // 실시간 차트 카운트 함수 (슈파베이스 조회 분기 유지)
  const refreshChartCount = useCallback(async (uid) => {
    if (!uid) return;
    try {
      // 🌟 슈파베이스 단독 모드일 때 나스 DB 카운트 계측
      if (dbMode === 'supabase') {
        const { count, error } = await supabase
          .from('drilling_charts')
          .select('*', { count: 'exact', head: true })
          .eq('userId', uid);
        
        if (!error) {
          setCurrentChartsCount(count || 0);
          console.log("📊 [Supabase 조회] 현재 전체 차트 수:", count);
        }
        return;
      }

      // 파이어베이스 기본 로직
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
          // 💡 [오류 완치] 블록 스코프 변수 선언을 분기문보다 최상단으로 조기 격상하여 ReferenceError 원천 차단
          let currentTier = "trial_beta"; 

          // 🌟 [Supabase 단독 모드 조회 분기]
          if (dbMode === 'supabase') {
            const { data: sbUser, error: sbUserErr } = await supabase
              .from('users')
              .select('*')
              .eq('email', currentUser.email)
              .single();

            if (!sbUserErr && sbUser) {
              currentTier = sbUser.tier || "trial_beta";
              
              setUser({ ...currentUser, tier: currentTier });
              setUserTier(currentTier);
              setMaxChartsAllowed(getMaxChartsAllowed(currentTier));
              await refreshChartCount(currentUser.uid);
            } else {
              currentTier = "trial_beta";
              setUser({ ...currentUser, tier: currentTier });
              setUserTier(currentTier);
              setMaxChartsAllowed(getMaxChartsAllowed(currentTier));
            }
            setIsAuthChecking(false);
            return; // 파이어베이스 로직 건너뛰기
          }

          // 파이어베이스 기본 로직 및 듀얼 적재 레이어
          const userRef = doc(db, 'users', currentUser.email);
          const userSnap = await getDoc(userRef);

          let finalActiveDevices = [deviceId];
          let finalMaxDevices = 2;
          let finalJoinedAtIso = new Date().toISOString();

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const { activeDevices = [], maxDevices = 1 } = userData;
            currentTier = userData.tier || "trial_beta";
            finalActiveDevices = activeDevices;
            finalMaxDevices = maxDevices;

            if (userData.joinedAt) {
              finalJoinedAtIso = typeof userData.joinedAt.toDate === 'function' 
                ? userData.joinedAt.toDate().toISOString() 
                : new Date(userData.joinedAt).toISOString();
            }

            if (!ADMIN_EMAILS.includes(currentUser.email)) {
              const isKnown = activeDevices.includes(deviceId);
              if (!isKnown && activeDevices.length >= maxDevices) {
                setAuthErrorMsg("기기 제한 초과: 동시에 사용할 수 있는 기기 수를 초과했습니다.");
                await signOut(auth);
                return;
              }
              if (!isKnown) {
                await updateDoc(userRef, { activeDevices: arrayUnion(deviceId) });
                finalActiveDevices = [...activeDevices, deviceId];
              }
            }
            
            if (dbMode === 'dual') {
              const shadowPayload = { 
                ...userData, 
                activeDevices: finalActiveDevices,
                joinedAt: finalJoinedAtIso 
              };

              await supabase
                .from('users')
                .upsert({
                  email: currentUser.email,
                  uid: currentUser.uid,
                  displayName: userData.displayName || currentUser.displayName || "인증된 지공사",
                  status: userData.status || 'active',
                  tier: currentTier,
                  customerCount: userData.customerCount || 0,
                  chartCount: userData.chartCount || 0,
                  maxDevices: finalMaxDevices,
                  activeDevices: finalActiveDevices,
                  joinedAt: finalJoinedAtIso,
                  user_data: shadowPayload
                }, { onConflict: 'email' });
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
            
            if (dbMode === 'dual') {
              const shadowNewPayload = {
                ...newUserProfile,
                joinedAt: finalJoinedAtIso
              };

              await supabase
                .from('users')
                .insert([{
                  email: currentUser.email,
                  uid: currentUser.uid,
                  displayName: newUserProfile.displayName,
                  status: newUserProfile.status,
                  tier: newUserProfile.tier,
                  customerCount: 0,
                  chartCount: 0,
                  maxDevices: newUserProfile.maxDevices,
                  activeDevices: newUserProfile.activeDevices,
                  joinedAt: finalJoinedAtIso,
                  user_data: shadowNewPayload
                }]);
            }

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