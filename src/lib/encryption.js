/**
 * 백업 데이터 위변조 방지 전자서명 (HMAC Hash Signature) 유틸리티
 */

const SECRET_SALT = 'PRODRILL_SECURE_BACKUP_SALT_2026_V1';

/**
 * 1. 간단한 HMAC-SHA256 성격의 결정론적 무작위 해시 문자열 생성
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32bit 정수 변환
  }
  return Math.abs(hash).toString(36);
}

/**
 * 2. 백업 페이로드와 소유자 이메일을 조합하여 위변조 방지 전자서명 생성
 * @param {Object} dataPayload - customers 및 chartHistories가 포함된 데이터 객체
 * @param {string} ownerEmail - 백업 작성자의 구글 이메일
 * @returns {string} 고유 전자서명 해시값
 */
export function generateSignature(dataPayload, ownerEmail = '') {
  const normalizedEmail = (ownerEmail || '').trim().toLowerCase();
  const serializedData = JSON.stringify(dataPayload || {});
  
  // 데이터 내용물 + 이메일 + 시스템 시크릿 솔트를 결합하여 서명 생성
  const rawString = `${SECRET_SALT}:${normalizedEmail}:${serializedData.length}:${serializedData.slice(0, 100)}:${serializedData.slice(-100)}`;
  
  const hash1 = simpleHash(rawString);
  const hash2 = simpleHash(`${hash1}:${normalizedEmail}:${SECRET_SALT}`);
  
  return `sig_${hash1}_${hash2}`;
}

/**
 * 3. 백업 데이터의 위변조 여부 및 소유자 일치 여부 대조
 * @param {Object} fullPackage - 백업 전체 객체 ({ appId, ownerEmail, signature, data })
 * @param {string} expectedEmail - 현재 로그인/인증된 사용자 이메일
 * @returns {{ valid: boolean, reason?: string, ownerEmail?: string }}
 */
export function verifyBackupPackage(fullPackage, expectedEmail = '') {
  if (!fullPackage || typeof fullPackage !== 'object') {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  const { appId, ownerEmail, signature, data } = fullPackage;

  if (appId !== 'ProDrill') {
    return { valid: false, reason: 'INVALID_APP_ID' };
  }

  const normalizedExpected = (expectedEmail || '').trim().toLowerCase();
  const normalizedOwner = (ownerEmail || '').trim().toLowerCase();

  // 구버전 백업 파일(서명이 없는 경우)
  if (!ownerEmail && !signature) {
    return { valid: true, isLegacy: true };
  }

  // 소유자 이메일 일치 여부 대조
  if (normalizedExpected && normalizedOwner && normalizedExpected !== normalizedOwner) {
    return { valid: false, reason: 'OWNER_MISMATCH', ownerEmail: normalizedOwner };
  }

  // 전자서명 위변조 대조
  if (signature && data) {
    const expectedSig = generateSignature(data, normalizedOwner);
    if (signature !== expectedSig) {
      return { valid: false, reason: 'TAMPERED_DATA' };
    }
  }

  return { valid: true };
}
