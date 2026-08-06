import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSignature, verifyBackupPackage } from '../src/lib/encryption.js';
import { filterCustomersByOwner } from '../src/lib/customerStorage.js';

test('account isolation and createdByEmail filtering check', () => {
  const customerA = { id: 'c1', name: '김볼러', createdByEmail: 'driller_a@gmail.com' };
  const customerB = { id: 'c2', name: '이볼러', createdByEmail: 'driller_b@gmail.com' };

  const customers = [customerA, customerB];
  
  // A 사용자의 관점 백업 필터링
  const ownerA = 'driller_a@gmail.com';
  const filteredForA = filterCustomersByOwner(customers, ownerA);
  assert.equal(filteredForA.length, 1);
  assert.equal(filteredForA[0].name, '김볼러');

  // B 사용자의 관점 백업 필터링 (타인 레코드 숨김)
  const ownerB = 'driller_b@gmail.com';
  const filteredForB = filterCustomersByOwner(customers, ownerB);
  assert.equal(filteredForB.length, 1);
  assert.equal(filteredForB[0].name, '이볼러');

  // 본인 계정 데이터로 작성한 백업 JSON 패키지
  const payloadA = { customers: filteredForA, chartHistories: {} };
  const sigA = generateSignature(payloadA, ownerA);
  const pkgA = { appId: 'ProDrill', ownerEmail: ownerA, signature: sigA, data: payloadA };

  // 1. 본인 계정(driller_a)에서는 정상 복원 허용
  const verificationA = verifyBackupPackage(pkgA, 'driller_a@gmail.com');
  assert.equal(verificationA.valid, true);

  // 2. 다른 계정(driller_b)으로 로그인 후 A의 백업 파일로 수동 복원 시도 시 100% 거부
  const verificationB = verifyBackupPackage(pkgA, 'driller_b@gmail.com');
  assert.equal(verificationB.valid, false);
  assert.equal(verificationB.reason, 'OWNER_MISMATCH');
});
