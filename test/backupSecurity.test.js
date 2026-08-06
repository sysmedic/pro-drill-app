import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSignature, verifyBackupPackage } from '../src/lib/encryption.js';

test('backup package signature generation and verification', () => {
  const dataPayload = {
    customers: [{ id: 'c1', name: '홍길동' }],
    chartHistories: { c1: [{ id: 'h1', span: '4 1/2' }] }
  };
  const ownerEmail = 'driller_a@gmail.com';

  const signature = generateSignature(dataPayload, ownerEmail);
  assert.ok(signature.startsWith('sig_'));

  const backupPackage = {
    appId: 'ProDrill',
    exportedAt: new Date().toISOString(),
    ownerEmail,
    signature,
    data: dataPayload
  };

  // 1. 본인 계정 대조 시 정상 통과
  const result1 = verifyBackupPackage(backupPackage, 'driller_a@gmail.com');
  assert.equal(result1.valid, true);

  // 2. 타인 계정(driller_b)으로 대조 시 OWNER_MISMATCH 차단
  const result2 = verifyBackupPackage(backupPackage, 'driller_b@gmail.com');
  assert.equal(result2.valid, false);
  assert.equal(result2.reason, 'OWNER_MISMATCH');

  // 3. 이메일을 텍스트로 위변조(Tampering)한 경우 서명 불일치로 TAMPERED_DATA 차단
  const tamperedPackage = {
    ...backupPackage,
    ownerEmail: 'driller_b@gmail.com' // 텍스트만 억지로 수정함
  };
  const result3 = verifyBackupPackage(tamperedPackage, 'driller_b@gmail.com');
  assert.equal(result3.valid, false);
  assert.equal(result3.reason, 'TAMPERED_DATA');
});
