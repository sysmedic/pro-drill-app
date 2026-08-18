/* global process */
import { doc, getDoc, setDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
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

      if (status !== 'active') {
        // 해지, 정지, 만료 상태 수령 -> 즉시 인증 무효화
        localStorage.setItem('prodrill_license_certified', 'false');
        return 'suspended';
      } else {
        // 정상 활성 상태 (active)
        localStorage.setItem('prodrill_license_certified', 'true');
        localStorage.setItem('prodrill_certified_email_hash', emailHash);
        return tier;
      }
    } else {
      // 라이선스 테이블에 정보 없음 (관리자가 인증 해지 또는 삭제한 계정)
      const prevCertified = isLicenseCertified();
      localStorage.setItem('prodrill_license_certified', 'false');
      if (prevCertified) {
        localStorage.setItem('prodrill_license_status', 'suspended');
        return 'suspended';
      }
      localStorage.setItem('prodrill_license_status', 'trial');
      return 'trial';
    }
  } catch (error) {
    console.error("원격 라이선스 조회 에러 (오프라인 폴백 기동):", error);
    // 오프라인 시 로컬 스토리지에 캐시된 마지막 상태를 기준으로 판단
    const cachedStatus = localStorage.getItem('prodrill_license_status');
    if (cachedStatus === 'locked' || cachedStatus === 'suspended' || cachedStatus === 'revoked') return 'suspended';
    
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
  const status = localStorage.getItem('prodrill_license_status');
  if (status === 'suspended' || status === 'revoked' || status === 'locked' || status === 'inactive') {
    return false;
  }
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prodrill_license_updated'));
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error("인증 실패:", error);
    return false;
  }
};

/**
 * 엑셀 마이그레이션 원격 파이어베이스 (Firestore) 동기화 헬퍼
 */
export const fetchRemoteMigrationConfig = async () => {
  if (typeof window === 'undefined') return null;
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTestEnv) return null;

  try {
    const docRef = doc(licenseDb, 'admin_settings', 'migration_config');
    const docSnap = await getDoc(docRef).catch(() => null);
    if (docSnap && docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.isMigrationModeOn === 'boolean') {
        localStorage.setItem('prodrill_migration_mode_enabled', data.isMigrationModeOn ? 'true' : 'false');
      }
      if (Array.isArray(data.allowedEmails)) {
        localStorage.setItem('prodrill_migration_allowed_emails', JSON.stringify(data.allowedEmails));
      }
      return data;
    }
  } catch (err) {
    console.warn("원격 마이그레이션 설정 로드 지연 (로컬 캐시 보존):", err);
  }
  return null;
};

export const saveRemoteMigrationConfig = async (isMigrationModeOn, allowedEmails) => {
  if (typeof window === 'undefined') return false;
  
  localStorage.setItem('prodrill_migration_mode_enabled', isMigrationModeOn ? 'true' : 'false');
  localStorage.setItem('prodrill_migration_allowed_emails', JSON.stringify(allowedEmails));

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTestEnv) return true;

  try {
    const docRef = doc(licenseDb, 'admin_settings', 'migration_config');
    await setDoc(docRef, {
      isMigrationModeOn: !!isMigrationModeOn,
      allowedEmails: Array.isArray(allowedEmails) ? allowedEmails : [],
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn("원격 마이그레이션 설정 저장 실패:", err);
    return false;
  }
};

/**
 * 엑셀 마이그레이션 글로벌 모드 ON/OFF 헬퍼 (기본값: true)
 */
export const isMigrationModeGloballyEnabled = () => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('prodrill_migration_mode_enabled') !== 'false';
};

export const setMigrationModeGloballyEnabled = (enabled) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('prodrill_migration_mode_enabled', enabled ? 'true' : 'false');
  saveRemoteMigrationConfig(enabled, getMigrationAllowedEmails());
};

/**
 * 엑셀 마이그레이션 동적 허용 이메일 목록 관리 헬퍼
 */
export const getMigrationAllowedEmails = () => {
  const DEFAULT_EMAILS = ['sysmedic@gmail.com'];
  if (typeof window === 'undefined') return DEFAULT_EMAILS;
  try {
    const raw = localStorage.getItem('prodrill_migration_allowed_emails');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(e => String(e).trim().toLowerCase());
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_EMAILS;
};

export const addMigrationAllowedEmail = (email) => {
  if (!email || typeof window === 'undefined') return false;
  const clean = String(email).trim().toLowerCase();
  const current = getMigrationAllowedEmails();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    saveRemoteMigrationConfig(isMigrationModeGloballyEnabled(), updated);
    return true;
  }
  return false;
};

export const removeMigrationAllowedEmail = (email) => {
  if (!email || typeof window === 'undefined') return false;
  const clean = String(email).trim().toLowerCase();
  const current = getMigrationAllowedEmails();
  const updated = current.filter(e => e !== clean);
  saveRemoteMigrationConfig(isMigrationModeGloballyEnabled(), updated);
  return true;
};

/**
 * 엑셀 마이그레이션 보안 가시성 허용 계정 여부 체크 (글로벌 스위치 + 허가 목록 대조)
 */
export const isMigrationAuthorizedEmail = (email) => {
  if (!isMigrationModeGloballyEnabled()) return false;
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  const allowed = getMigrationAllowedEmails();
  return allowed.includes(clean);
};

// 7. Trial 사용자 기기 통계 수집 및 서버 시각 기준 잔여일수 검증 (무한 연장 방어)
export const updateTrialUserStats = async (email, emailHash, localDaysLeft) => {
  if (typeof window === 'undefined' || (!email && !emailHash)) return;
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTestEnv) return;

  try {
    const hashKey = emailHash || (email ? await getSha256Hash(email) : '');
    if (!hashKey) return;

    const docRef = doc(licenseDb, 'trial_users', hashKey);
    const docSnap = await getDoc(docRef).catch(() => null);

    let calculatedDaysLeft = typeof localDaysLeft === 'number' ? localDaysLeft : 90;

    if (docSnap && docSnap.exists()) {
      const data = docSnap.data();
      if (data.createdAt) {
        const createdMs = data.createdAt.seconds ? data.createdAt.seconds * 1000 : new Date(data.createdAt).getTime();
        const diffDays = (new Date().getTime() - createdMs) / (1000 * 60 * 60 * 24);
        calculatedDaysLeft = Math.max(0, Math.ceil(GRACE_DAYS - diffDays));
      }
      await setDoc(docRef, {
        email: (email || '').trim().toLowerCase(),
        lastActive: serverTimestamp(),
        daysLeft: calculatedDaysLeft,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } else {
      // 🌟 신규 유저 또는 파이어베이스 콘솔 삭제 후 재등록: createdAt 서버 시각 최초 기록 + 신규 90일 트라이얼 시작
      const newLaunchTime = new Date().toISOString();
      localStorage.setItem('prodrill_first_launch_time', newLaunchTime);
      await setDoc(docRef, {
        email: (email || '').trim().toLowerCase(),
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        daysLeft: 90,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
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
  localStorage.removeItem('prodrill_user_profile');
  initFirstLaunchTime();
};

// 9. XSS 및 악성 코드 입력을 방지하기 위한 문자열 정제(Sanitization) 헬퍼
export const sanitizeString = (str = '', maxLength = 30) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // HTML 태그 제거
    .replace(/[<>"'&]/g, '')   // 특수 문자 탈출
    .trim()
    .slice(0, maxLength);
};

// 10. 로컬 스토리지에 캐시된 지공사 프로필 조회
export const getUserProfile = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('prodrill_user_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// 10.5. 원격 Firestore에서 지공사 프로필 동기화 조회 (원격 삭제 시 로컬 캐시 자동 초기화)
export const fetchRemoteUserProfile = async (email) => {
  if (typeof window === 'undefined' || !email) return null;
  const normalized = email.trim().toLowerCase();
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTestEnv) return getUserProfile();

  try {
    const hashed = await getSha256Hash(normalized);
    const prevCertified = isLicenseCertified();

    // 1. licenses 테이블 조회
    const licenseRef = doc(licenseDb, 'licenses', hashed);
    const licenseSnap = await getDoc(licenseRef).catch(() => null);

    if (licenseSnap && licenseSnap.exists()) {
      const data = licenseSnap.data();
      const status = data.status || 'active';
      if (status !== 'active') {
        // 원격 라이선스 인증 해지/정지 상태
        localStorage.setItem('prodrill_license_certified', 'false');
        localStorage.setItem('prodrill_license_status', status || 'suspended');
        return null;
      }
      
      localStorage.setItem('prodrill_license_certified', 'true');
      localStorage.setItem('prodrill_license_status', 'active');
      if (data.name || data.shopName) {
        const prof = {
          email: normalized,
          name: data.name || '',
          shopName: data.shopName || '',
          phone: data.phone || '',
          updatedAt: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()
        };
        localStorage.setItem('prodrill_user_profile', JSON.stringify(prof));
        return prof;
      }
    } else if (prevCertified) {
      // 이전에 인증된 계정이었으나 라이선스 컬렉션에서 삭제/해지된 경우
      localStorage.setItem('prodrill_license_certified', 'false');
      localStorage.setItem('prodrill_license_status', 'suspended');
      return null;
    }

    // 2. trial_users 테이블 조회
    const trialRef = doc(licenseDb, 'trial_users', hashed);
    const trialSnap = await getDoc(trialRef).catch(() => null);

    if (trialSnap && trialSnap.exists()) {
      const data = trialSnap.data();
      if (data && (data.name || data.shopName)) {
        const prof = {
          email: normalized,
          name: data.name || '',
          shopName: data.shopName || '',
          phone: data.phone || '',
          updatedAt: data.updatedAt ? new Date(data.updatedAt.seconds * 1000).toISOString() : new Date().toISOString()
        };
        localStorage.setItem('prodrill_user_profile', JSON.stringify(prof));
        return prof;
      }
    }

    return getUserProfile();
  } catch (err) {
    console.warn("원격 프로필 동기화 지연 (네트워크 오프라인 폴백):", err);
    return getUserProfile();
  }
};

// 11. 지공사 프로필 저장 및 Audit Trail(변경 이력) 원격 동기화
export const saveUserProfile = async (email, profileData = {}, changedBy = 'user') => {
  if (typeof window === 'undefined' || !email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = sanitizeString(profileData?.name || '', 15);
  const cleanShop = sanitizeString(profileData?.shopName || '', 30);
  const cleanPhone = sanitizeString(profileData?.phone || '', 20);

  const profilePayload = {
    email: normalizedEmail,
    name: cleanName,
    shopName: cleanShop,
    phone: cleanPhone,
    updatedAt: new Date().toISOString()
  };

  // 1. 로컬 캐시 갱신
  localStorage.setItem('prodrill_user_profile', JSON.stringify(profilePayload));

  // 2. 테스트 환경일 경우 원격 IO 우회
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  if (isTestEnv) return true;

  try {
    const hashed = await getSha256Hash(normalizedEmail);
    const auditRecord = {
      timestamp: new Date().toISOString(),
      changedBy: changedBy,
      newName: cleanName,
      newShopName: cleanShop,
      phone: cleanPhone
    };

    const certified = isLicenseCertified();
    const collectionName = certified ? 'licenses' : 'trial_users';
    const targetDocRef = doc(licenseDb, collectionName, hashed);

    // 기존 문서에서 이전 프로필 정보 읽어서 변경 이력 바인딩
    const docSnap = await getDoc(targetDocRef).catch(() => null);
    if (docSnap && docSnap.exists()) {
      const prevData = docSnap.data();
      auditRecord.prevName = prevData.name || '';
      auditRecord.prevShopName = prevData.shopName || '';
    }

    await setDoc(targetDocRef, {
      email: normalizedEmail,
      name: cleanName,
      shopName: cleanShop,
      phone: cleanPhone,
      profileHistory: arrayUnion(auditRecord),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return true;
  } catch (err) {
    console.warn("원격 프로필 저장 지연 (로컬 저장소 캐시 보장):", err);
    return true;
  }
};

