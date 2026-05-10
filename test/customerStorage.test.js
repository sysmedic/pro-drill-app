import test from 'node:test';
import assert from 'node:assert/strict';

import {
  loadCustomers,
  readCustomers,
  saveCustomers,
} from '../src/lib/customerStorage.js';
import { CUSTOMERS_KEY } from '../src/lib/storageKeys.js';
import { MockStorage } from './helpers/mockStorage.js';

test('readCustomers returns stored customer arrays', () => {
  const customers = [{ id: 'cus_1', name: '홍길동' }];
  const storage = new MockStorage({
    [CUSTOMERS_KEY]: JSON.stringify(customers),
  });

  assert.deepEqual(readCustomers(storage), {
    customers,
    status: 'ok',
  });
  assert.deepEqual(loadCustomers(storage), customers);
});

test('readCustomers does not overwrite malformed JSON', () => {
  const malformed = '[{"id":"cus_bad"';
  const storage = new MockStorage({
    [CUSTOMERS_KEY]: malformed,
  });

  const result = readCustomers(storage);

  assert.equal(result.status, 'malformed');
  assert.deepEqual(result.customers, []);
  assert.equal(storage.getItem(CUSTOMERS_KEY), malformed);
});

test('readCustomers does not overwrite non-array values', () => {
  const nonArray = JSON.stringify({ id: 'cus_object', name: '객체값' });
  const storage = new MockStorage({
    [CUSTOMERS_KEY]: nonArray,
  });

  assert.deepEqual(readCustomers(storage), {
    customers: [],
    status: 'invalid',
  });
  assert.equal(storage.getItem(CUSTOMERS_KEY), nonArray);
});

test('saveCustomers only writes explicit customer arrays', () => {
  const original = JSON.stringify([{ id: 'cus_original', name: '기존' }]);
  const nextCustomers = [{ id: 'cus_next', name: '신규' }];
  const storage = new MockStorage({
    [CUSTOMERS_KEY]: original,
  });

  assert.equal(saveCustomers({ id: 'not_array' }, storage), false);
  assert.equal(storage.getItem(CUSTOMERS_KEY), original);

  assert.equal(saveCustomers(nextCustomers, storage), true);
  assert.equal(storage.getItem(CUSTOMERS_KEY), JSON.stringify(nextCustomers));
});

test('saveCustomers reports write failures without throwing', () => {
  class FailingStorage extends MockStorage {
    setItem() {
      throw new Error('quota exceeded');
    }
  }

  const storage = new FailingStorage();

  assert.equal(saveCustomers([{ id: 'cus_fail', name: '실패' }], storage), false);
  assert.equal(storage.has(CUSTOMERS_KEY), false);
});
