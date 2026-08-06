import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';

// 브라우저의 Web Crypto API 및 localStorage를 Node.js 환경에서 작동하도록 모조 객체(Mock) 주입
global.window = {};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (algorithm, data) => {
        const hash = nodeCrypto.createHash('sha256').update(Buffer.from(data)).digest();
        // 브라우저 subtle.digest는 ArrayBuffer를 반환하므로 복사본 생성
        const arrayBuffer = new ArrayBuffer(hash.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < hash.length; i++) {
          view[i] = hash[i];
        }
        return arrayBuffer;
      }
    }
  },
  configurable: true,
  writable: true
});

const store = {};
global.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
  }
};

import { 
  initFirstLaunchTime, 
  calculateGracePeriod, 
  certifyUserEmail, 
  isLicenseCertified,
  resetCertification
} from '../src/lib/userLicenseManager.js';

test('initFirstLaunchTime creates and saves first launch ISOString timestamp', () => {
  localStorage.clear();
  const time = initFirstLaunchTime();
  assert.ok(time);
  assert.equal(localStorage.getItem('prodrill_first_launch_time'), time);
});

test('calculateGracePeriod returns correct days left within 90 days', () => {
  localStorage.clear();
  // 가상으로 오늘을 첫 방문일로 세팅
  initFirstLaunchTime();
  
  const period = calculateGracePeriod();
  assert.equal(period.daysLeft, 90);
  assert.equal(period.isExpired, false);
});

test('calculateGracePeriod reports expired when 90 days limit passes', () => {
  localStorage.clear();
  // 91일 전 방문한 것으로 타임스탬프 강제 설정
  const prevDate = new Date();
  prevDate.setDate(prevDate.getDate() - 91);
  localStorage.setItem('prodrill_first_launch_time', prevDate.toISOString());

  const period = calculateGracePeriod();
  assert.equal(period.daysLeft, 0);
  assert.equal(period.isExpired, true);
});

test('certifyUserEmail approves trial google linking for non-certified emails within 90 days', async () => {
  localStorage.clear();
  
  // 트라이얼 90일 이내 일반 이메일 시도 (연동 성공)
  const passResult = await certifyUserEmail('stranger@gmail.com');
  assert.equal(passResult, true);
  assert.equal(isLicenseCertified(), false);
  assert.equal(localStorage.getItem('prodrill_trial_google_linked'), 'true');

  // 트라이얼 91일 지난 상태에서 연동 시도 (연동 차단)
  localStorage.clear();
  const prevDate = new Date();
  prevDate.setDate(prevDate.getDate() - 91);
  localStorage.setItem('prodrill_first_launch_time', prevDate.toISOString());

  const expiredResult = await certifyUserEmail('stranger@gmail.com');
  assert.equal(expiredResult, false);
});

test('certifyUserEmail approves registered whitelist Gmail matching hash values', async () => {
  localStorage.clear();

  // 허용된 이메일 시도 (sysmedic@gmail.com)
  const passResult = await certifyUserEmail('sysmedic@gmail.com');
  assert.equal(passResult, true);
  assert.equal(isLicenseCertified(), true);

  // 인증 완료 후에는 유예 기간 만료와 상관 없이 항상 daysLeft가 무제한(9999)으로 풀림
  const period = calculateGracePeriod();
  assert.equal(period.daysLeft, 9999);
  assert.equal(period.isExpired, false);
});
