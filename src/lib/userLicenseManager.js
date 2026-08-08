/* global process */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { licenseDb } from './licenseFirebase.js';

/**
 * ProDrill 라이선스 및 유예 기간 제어 매니저
 * (보안을 위해 이메일 원문이 아닌 SHA-256 단방향 해시값 목록을 비교 대조합니다.)
 */

export const MASTER_HASH = '05311b63528f338bd7fa5d67c765f2a5ea9e0d30360236668eb2cc477ae51024';
export const MASTER_EMAIL = 'sysmedic@gmail.com';

export const getTierLabel = (tier) => {
  const t = (tier || '').toLowerCase();
  if (t === 'master') return 'MASTER';
  if (t === 'certified') return '인증 사용자';
  return 'Trial';
};

const GRACE_DAYS = 90;

// 1. 단방향 SHA-256 해싱 함수 (Web Crypto API 기반)
export const getSha256Hash = async (text) => {
  if (!text) return '';
  const msgBuffer = new TextEncoder().encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 2. 최초 실행 시각 초기화 및 저장
export const initFirstLaunchTime = () => {
  if (typeof window === 'undefined') return null;
  let firstTime = localStorage.getItem('prodrill_first_launch_time');
  if (!firstTime) {
    firstTime = new Date().toISOString();
    localStorage.setItem('prodrill_first_launch_time', firstTime);
  }
  return firstTime;
};

// 3. 라이선스 인증 상태 조회
export const isLicenseCertified = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('prodrill_license_certified') === 'true';
};

// 4. 유예 기간 정보 계산 (D-Day 산출)
export const calculateGracePeriod = () => {
  if (typeof window === 'undefined') return { daysLeft: GRACE_DAYS, isExpired: false };
  
  const certified = isLicenseCertified();
  if (certified) {
    // 이미 구글 계정 인증을 완료한 사용자는 프리패스 통과
    return { daysLeft: 9999, isExpired: false };
  }

  const firstLaunch = initFirstLaunchTime();
  const launchDate = new Date(firstLaunch);
  const currentDate = new Date();
  
  // 경과 시간 계산
  const diffTime = currentDate.getTime() - launchDate.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  const daysLeft = Math.max(0, Math.ceil(GRACE_DAYS - diffDays));
  const isExpired = daysLeft <= 0;
  
  return { daysLeft, isExpired };
};

// 5. 원격 Firestore 라이선스 상태 대조 및 로컬 캐싱 갱신
export const checkRemoteLicenseStatus = async (emailHash) => {
  if (!emailHash) return 'trial';
  
  const plainEmail = typeof window !== 'undefined' ? (localStorage.getItem('prodrill_certified_email_plain') || '').trim().toLowerCase() : '';
  if (plainEmail === MASTER_EMAIL || emailHash === MASTER_HASH) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('prodrill_license_certified', 'true');
      localStorage.setItem('prodrill_certified_email_hash', MASTER_HASH);
      localStorage.setItem('prodrill_license_status', 'active');
    }
    return 'master';
  }
  
  // 🧪 Node.js 유닛 테스트 환경에서는 원격 파이어베이스 네트워크 IO 우회
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTestEnv) {
    return 'trial';
  }

  try {
    const docRef = doc(licenseDb, 'licenses', emailHash);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const status = data.status || 'active';
      const tier = data.userTier || 'certified';

      localStorage.setItem('prodrill_license_status', status);

      if (status === 'locked') {
        // 강제 원격 잠금 상태 수령
        return 'locked';
      } else if (status === 'suspended') {
        // 정지 및 만료 상태 수령
        localStorage.setItem('prodrill_license_certified', 'false');
        return 'suspended';
      } else {
        // 정상 활성 상태 (active)
        localStorage.setItem('prodrill_license_certified', 'true');
        localStorage.setItem('prodrill_certified_email_hash', emailHash);
        return tier;
      }
    } else {
      // 라이선스 테이블에 정보 없음
      localStorage.setItem('prodrill_license_certified', 'false');
      localStorage.setItem('prodrill_license_status', 'trial');
      return 'trial';
    }
  } catch (error) {
    console.error("원격 라이선스 조회 에러 (오프라인 폴백 기동):", error);
    // 오프라인 시 로컬 스토리지에 캐시된 마지막 상태를 기준으로 판단
    const cachedStatus = localStorage.getItem('prodrill_license_status');
    if (cachedStatus === 'locked') return 'locked';
    if (cachedStatus === 'suspended') return 'suspended';
    
    const certified = isLicenseCertified();
    if (certified) {
      return emailHash === MASTER_HASH ? 'master' : 'certified';
    }
    return 'trial';
  }
};

// 5.5 구글 계정 연동 가능 여부 판단 (트라이얼 90일 이내 또는 정식 인증 계정)
export const isGoogleLinkingAllowed = () => {
  if (typeof window === 'undefined') return true;
  const certified = isLicenseCertified();
  if (certified) return true;
  const { isExpired } = calculateGracePeriod();
  return !isExpired;
};

export const isSyncAllowed = isGoogleLinkingAllowed;

// 6. 이메일 화이트리스트 대조 및 인증 승인 (구글 로그인 완료 시 호출)
export const certifyUserEmail = async (email) => {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  
  // 🧪 Node.js 유닛 테스트 환경에서는 원격 파이어베이스 네트워크 IO 우회
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  
  try {
    const hashed = await getSha256Hash(normalizedEmail);
    
    // 👑 마스터 계정(sysmedic@gmail.com) 무조건 승인 및 파이어베이스 문서 동기화
    if (normalizedEmail === MASTER_EMAIL || hashed === MASTER_HASH) {
      if (!isTestEnv) {
        try {
          const docRef = doc(licenseDb, 'licenses', MASTER_HASH);
          await setDoc(docRef, {
            userTier: 'master',
            status: 'active',
            email: MASTER_EMAIL,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn("마스터 라이선스 문서 동기화 스킵:", e);
        }
      }
      localStorage.setItem('prodrill_license_certified', 'true');
      localStorage.setItem('prodrill_certified_email_hash', MASTER_HASH);
      localStorage.setItem('prodrill_certified_email_plain', MASTER_EMAIL);
      localStorage.setItem('prodrill_license_status', 'active');
      localStorage.setItem('prodrill_linked_email', MASTER_EMAIL);
      return true;
    }

    if (isTestEnv) {
      const { isExpired } = calculateGracePeriod();
      if (!isExpired) {
        localStorage.setItem('prodrill_trial_google_linked', 'true');
        localStorage.setItem('prodrill_linked_email', normalizedEmail);
        return true;
      }
      return false;
    }

    // 일반 지공사 이메일 해시는 Firestore에서 실시간 활성 여부 대조
    const status = await checkRemoteLicenseStatus(hashed);
    if (status === 'certified' || status === 'master') {
      localStorage.setItem('prodrill_linked_email', normalizedEmail);
      return true;
    }

    // 🔥 정식 등록 이메일이 아니더라도, 트라이얼 기간(90일 이내)이면 구글 연동 및 백업 지원 허용 + trial_users 기록!
    const { daysLeft, isExpired } = calculateGracePeriod();
    if (!isExpired) {
      localStorage.setItem('prodrill_trial_google_linked', 'true');
      localStorage.setItem('prodrill_linked_email', normalizedEmail);
      await updateTrialUserStats(normalizedEmail, hashed, daysLeft);
      return true;
    }

    return false;
  } catch (error) {
    console.error("이메일 해싱 인증 에러:", error);
    return false;
  }
};

// 7. Trial 사용자 기기 통계 수집 등록 (Firestore trial_users 수집 보장)
export const updateTrialUserStats = async (email, emailHash, daysLeft) => {
  if (typeof window === 'undefined' || (!email && !emailHash)) return;
  try {
    const hashKey = emailHash || (email ? await getSha256Hash(email) : '');
    if (!hashKey) return;

    const docRef = doc(licenseDb, 'trial_users', hashKey);
    await setDoc(docRef, {
      email: (email || '').trim().toLowerCase(),
      lastActive: serverTimestamp(),
      daysLeft: typeof daysLeft === 'number' ? daysLeft : 90,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("트라이얼 통계 저장 스킵 (오프라인/네트워크):", err);
  }
};

// 8. 인증 상태 강제 리셋 (테스트용)
export const resetCertification = () => {
  localStorage.removeItem('prodrill_license_certified');
  localStorage.removeItem('prodrill_certified_email_hash');
  localStorage.removeItem('prodrill_license_status');
  localStorage.removeItem('prodrill_first_launch_time');
  localStorage.removeItem('prodrill_device_uuid');
  initFirstLaunchTime();
};

