/**
 * ProDrill 라이선스 및 유예 기간 제어 매니저
 * (보안을 위해 이메일 원문이 아닌 SHA-256 단방향 해시값 목록을 비교 대조합니다.)
 */

// 🔒 정식 등록된 지공사 구글 이메일의 SHA-256 해시값 화이트리스트
const ALLOWED_HASHES = [
  '05311b63528f338bd7fa5d67c765f2a5ea9e0d30360236668eb2cc477ae51024', // sysmedic@gmail.com
  // 추후 추가할 지공사들의 Gmail 해시값을 이 배열에 추가 등록하면 됩니다.
];

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

// 5. 이메일 화이트리스트 대조 및 인증 승인
export const certifyUserEmail = async (email) => {
  if (!email) return false;
  
  try {
    const hashed = await getSha256Hash(email);
    const isApproved = ALLOWED_HASHES.includes(hashed);
    
    if (isApproved) {
      localStorage.setItem('prodrill_license_certified', 'true');
      localStorage.setItem('prodrill_certified_email_hash', hashed);
      return true;
    }
    return false;
  } catch (error) {
    console.error("이메일 해싱 인증 에러:", error);
    return false;
  }
};

// 6. 인증 상태 강제 리셋 (테스트용)
export const resetCertification = () => {
  localStorage.removeItem('prodrill_license_certified');
  localStorage.removeItem('prodrill_certified_email_hash');
  localStorage.removeItem('prodrill_first_launch_time');
  initFirstLaunchTime();
};
