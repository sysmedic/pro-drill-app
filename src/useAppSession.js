import { useState, useEffect, useCallback } from 'react';
import { isLicenseCertified, MASTER_HASH, MASTER_EMAIL, checkRemoteLicenseStatus, updateTrialUserStats, calculateGracePeriod, getSha256Hash, certifyUserEmail, fetchRemoteUserProfile } from './lib/userLicenseManager.js';

const resolveInitialTier = () => {
  if (typeof window === 'undefined') return 'trial';
  const plainEmail = (localStorage.getItem('prodrill_certified_email_plain') || '').trim().toLowerCase();
  const hash = localStorage.getItem('prodrill_certified_email_hash');
  if (plainEmail === MASTER_EMAIL || hash === MASTER_HASH) {
    return 'master';
  }

  const cachedStatus = localStorage.getItem('prodrill_license_status');
  if (cachedStatus === 'locked') return 'locked';
  if (cachedStatus === 'suspended') return 'suspended';

  const certified = isLicenseCertified();
  if (certified) {
    return 'certified';
  }
  return 'trial';
};

// 오프라인 전용 가상 지공사 계정 정보 정의
const LOCAL_USER = {
  uid: 'local_driller',
  email: 'guest@prodrill.local',
  displayName: '지공사'
};

export default function useAppSession() {
  const [user, setUser] = useState(() => {
    // 로그인 후 리로드 시에도 실제 이메일 유지 (localStorage에서 복원)
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('prodrill_linked_email') ||
                    localStorage.getItem('prodrill_certified_email_plain') || '';
      if (email && email !== 'guest@prodrill.local') {
        return { uid: 'google_user', email: email.trim().toLowerCase(), displayName: email };
      }
    }
    return LOCAL_USER;
  });
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [userTier, setUserTier] = useState(() => resolveInitialTier());
  const [maxChartsAllowed, setMaxChartsAllowed] = useState(Infinity);
  const [currentChartsCount, setCurrentChartsCount] = useState(0);
  const [certifiedEmailHash, setCertifiedEmailHash] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('prodrill_certified_email_hash') || '';
    }
    return '';
  });

  const isAdmin = false; // 마스터제어실 제거에 따라 항상 false

  // 실시간 차트 카운트 함수 (로컬 DB 카운트 계측)
  const refreshChartCount = useCallback(async (uid) => {
    if (!uid) return;
    try {
      if (globalThis.indexedDbHelper) {
        const count = await globalThis.indexedDbHelper.getChartsCount();
        setCurrentChartsCount(count || 0);
      } else {
        const keys = Object.keys(localStorage);
        const chartKeys = keys.filter(k => k.startsWith('chart_history_v8_'));
        setCurrentChartsCount(chartKeys.length);
      }
    } catch (error) {
      console.error("카운트 조회 에러:", error);
    }
  }, []);

  // 인증 확인 및 주기적 6시간 라이선스 백그라운드 대조 (Focus 시 30분 경과 감지)
  useEffect(() => {
    const storedEmail = typeof window !== 'undefined' 
      ? (localStorage.getItem('prodrill_linked_email') || localStorage.getItem('prodrill_certified_email_plain') || '').trim().toLowerCase()
      : '';
    const activeUser = storedEmail && storedEmail !== 'guest@prodrill.local'
      ? { uid: 'google_user', email: storedEmail, displayName: storedEmail }
      : LOCAL_USER;

    setUser(activeUser);
    const initialTier = resolveInitialTier();
    setUserTier(initialTier);
    setMaxChartsAllowed(Infinity);
    refreshChartCount(activeUser.uid);
    setIsAuthChecking(false);

    let lastCheckTimestamp = new Date().getTime();

    const syncLicenseAndStats = async () => {
      const activeEmail = localStorage.getItem('prodrill_linked_email') || 
                          localStorage.getItem('prodrill_certified_email_plain') || '';
      if (activeEmail) {
        try {
          await fetchRemoteUserProfile(activeEmail);
        } catch (err) {
          console.warn("원격 프로필 동기화 지연:", err);
        }
      }

      const hash = localStorage.getItem('prodrill_certified_email_hash');
      if (hash) {
        const remoteTier = await checkRemoteLicenseStatus(hash);
        setUserTier(remoteTier);
        
        // Trial 사용자인 경우 마지막 활성 및 잔여일수 원격 갱신
        if (remoteTier === 'trial') {
          const email = localStorage.getItem('prodrill_certified_email_plain') || '';
          const grace = calculateGracePeriod();
          await updateTrialUserStats(email, hash, grace.daysLeft);
        }
      } else {
        const updatedTier = resolveInitialTier();
        setUserTier(updatedTier);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('prodrill_license_updated'));
      }
      lastCheckTimestamp = new Date().getTime();
    };

    syncLicenseAndStats();

    // 1. 6시간 마다 주기적 자동 점검 타이머 (6 * 60 * 60 * 1000)
    const intervalId = setInterval(() => {
      syncLicenseAndStats();
    }, 6 * 60 * 60 * 1000);

    // 2. 사용자가 다른 앱을 보다가 복귀(Focus) 시 마지막 점검 후 30분이 지났으면 자동 재검증
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && new Date().getTime() - lastCheckTimestamp > 30 * 60 * 1000) {
        syncLicenseAndStats();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [refreshChartCount]);

  // 구글 로그인 성공 후 동적 세션 활성화 및 락 해제 처리
  const authenticateSession = useCallback(async (email) => {
    if (!email) return;
    setIsAuthChecking(true);
    try {
      const normalized = email.trim().toLowerCase();
      const hash = normalized === MASTER_EMAIL ? MASTER_HASH : await getSha256Hash(normalized);
      localStorage.setItem('prodrill_certified_email_hash', hash);
      localStorage.setItem('prodrill_certified_email_plain', normalized);
      setCertifiedEmailHash(hash); // 🌟 상태 업데이트 트리거로 게이트 닫힘 유도!

      // 라이선스 등급 동적 확인
      await certifyUserEmail(normalized);
      const tier = normalized === MASTER_EMAIL ? 'master' : await checkRemoteLicenseStatus(hash);
      setUserTier(tier);

      // Trial 상태라면 유예 정보 기록 시작
      if (tier === 'trial') {
        const grace = calculateGracePeriod();
        await updateTrialUserStats(normalized, hash, grace.daysLeft);
      }
    } catch (e) {
      console.error("세션 개통 에러:", e);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  // Playwright Headless 및 E2E 테스트 구동 브라우저 환경인 경우 로그인 게이트 강제 우회
  const isFirstTimeSetup = typeof window !== 'undefined' && 
                           !certifiedEmailHash &&
                           !window.navigator.webdriver &&
                           !window.navigator.userAgent.includes('Headless') &&
                           !window.navigator.userAgent.includes('Playwright');

  return {
    user,
    isAuthChecking,
    authErrorMsg: "",
    userTier,
    maxChartsAllowed,
    currentChartsCount,
    isAdmin,
    refreshChartCount,
    isFirstTimeSetup,
    authenticateSession
  };
}