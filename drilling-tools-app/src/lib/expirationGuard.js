/**
 * ProDrill Tools 한시적 배포 만료 및 시간 변조 방어 모듈 (Firebase 불필요 / Vercel 호환)
 * 만료 일시: 2026년 11월 30일 12:00 (KST)
 */

export const EXPIRE_TIMESTAMP = new Date('2026-11-30T12:00:00+09:00').getTime(); // 1796007600000
export const EXPIRE_DISPLAY_DATE = '2026년 11월 30일 12:00';

const STORAGE_LOCK_KEY = 'prodrill_tools_permanently_expired';
const STORAGE_LAST_CLOCK_KEY = 'prodrill_tools_last_valid_clock';

/**
 * 로컬 스토리지 및 기기 시계 기반 즉각 동기식 만료 검증
 * @returns {{ isExpired: boolean, reason?: 'EXPIRED' | 'TAMPERED' }}
 */
export function checkLocalExpiration() {
  try {
    // 0. 개발 편의용 URL 미리보기 (?previewExpired=1)
    if (typeof window !== 'undefined' && window.location.search.includes('previewExpired')) {
      return { isExpired: true, reason: 'EXPIRED' };
    }

    // 1. 이미 영구 만료 마킹된 경우
    if (localStorage.getItem(STORAGE_LOCK_KEY) === 'true') {
      return { isExpired: true, reason: 'EXPIRED' };
    }

    const now = Date.now();

    // 2. 만료 일시(2026.11.30 12:00) 초과 여부 검사
    if (now >= EXPIRE_TIMESTAMP) {
      localStorage.setItem(STORAGE_LOCK_KEY, 'true');
      return { isExpired: true, reason: 'EXPIRED' };
    }

    // 3. 기기 시계 과거 조작(Anti-Tampering) 검사
    const lastClockStr = localStorage.getItem(STORAGE_LAST_CLOCK_KEY);
    if (lastClockStr) {
      const lastClock = parseInt(lastClockStr, 10);
      // 현재 시간이 이전 실행 시간보다 1분(60초) 이상 과거인 경우 시계 조작으로 판정
      if (!isNaN(lastClock) && now < lastClock - 60000) {
        localStorage.setItem(STORAGE_LOCK_KEY, 'true');
        return { isExpired: true, reason: 'TAMPERED' };
      }
    }

    // 정상인 경우 마지막 실행 시간 갱신
    localStorage.setItem(STORAGE_LAST_CLOCK_KEY, String(now));
    return { isExpired: false };
  } catch (e) {
    console.error('Expiration check error:', e);
    // 보안 실패 시 안전하게 기본 검사
    return { isExpired: Date.now() >= EXPIRE_TIMESTAMP, reason: 'EXPIRED' };
  }
}

/**
 * Vercel HTTP Response Date 헤더를 이용한 표준 서버 시간 비동기 검증
 * @param {(expired: boolean, reason?: string) => void} onResult
 */
export async function verifyWithServerTime(onResult) {
  try {
    // Vercel 서버의 HTTP HEAD 요청을 통해 실제 서버 표준 시간 획득
    const res = await fetch(window.location.href, {
      method: 'HEAD',
      cache: 'no-store',
    });

    const serverDateHeader = res.headers.get('date');
    if (serverDateHeader) {
      const serverTime = new Date(serverDateHeader).getTime();
      if (!isNaN(serverTime) && serverTime >= EXPIRE_TIMESTAMP) {
        localStorage.setItem(STORAGE_LOCK_KEY, 'true');
        onResult(true, 'EXPIRED');
        return;
      }
    }
  } catch (e) {
    // 오프라인 상태일 때는 로컬 검사 결과를 신뢰
  }
}
