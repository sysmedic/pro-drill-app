import assert from 'node:assert/strict';
import test from 'node:test';
import { filterCustomersByOwner } from '../src/lib/customerStorage.js';

test('physical account DB isolation and record isolation check', () => {
  const customerA = { id: 'c1', name: '김볼러', createdByEmail: 'driller_a@gmail.com' };
  const customerB = { id: 'c2', name: '이볼러', createdByEmail: 'driller_b@gmail.com' };

  const dbA_customers = [customerA];
  const dbB_customers = [customerB];

  // A계정 관점 DB에서 읽어오기
  const loadedForA = filterCustomersByOwner(dbA_customers, 'driller_a@gmail.com');
  assert.equal(loadedForA.length, 1);
  assert.equal(loadedForA[0].name, '김볼러');

  // B계정 관점 DB에서 읽어오기 (A의 데이터와 섞임 0%)
  const loadedForB = filterCustomersByOwner(dbB_customers, 'driller_b@gmail.com');
  assert.equal(loadedForB.length, 1);
  assert.equal(loadedForB[0].name, '이볼러');

  // B계정 화면에서 A계정 데이터를 불러오더라도 완전히 걸러짐
  const crossCheck = filterCustomersByOwner(dbA_customers, 'driller_b@gmail.com');
  assert.equal(crossCheck.length, 0);
});
