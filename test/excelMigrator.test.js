import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSignature, verifyBackupPackage } from '../src/lib/encryption.js';

test('migration package signature generation and verification check', () => {
  const ownerEmail = 'sysmedic3@gmail.com';
  const testData = {
    customers: [
      { id: 'cust_1', name: '홍길동', createdByEmail: ownerEmail },
      { id: 'cust_2', name: '홍길동_서브', createdByEmail: ownerEmail }
    ],
    chartHistories: {
      'cust_1': [{ id: 'chart_1', name: '홍길동 차트', createdByEmail: ownerEmail }],
      'cust_2': [{ id: 'chart_2', name: '홍길동_서브 차트', createdByEmail: ownerEmail }]
    },
    customBowlingBalls: []
  };

  const sig = generateSignature(testData, ownerEmail);
  assert.ok(sig.startsWith('sig_'));

  const pkg = {
    appId: 'ProDrill',
    exportedAt: new Date().toISOString(),
    ownerEmail,
    signature: sig,
    version: 1,
    data: testData
  };

  const verification = verifyBackupPackage(pkg, ownerEmail);
  assert.equal(verification.valid, true);
});
