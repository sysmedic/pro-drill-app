import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteChartHistory,
  loadChartHistory,
  renameChartHistory,
  saveChartHistory,
} from '../src/lib/chartHistoryStorage.js';
import {
  chartHistoryKey,
  legacyChartHistoryKey,
  preV7ChartHistoryKey,
} from '../src/lib/storageKeys.js';
import { MockStorage } from './helpers/mockStorage.js';

test('loadChartHistory migrates v7 name history into v8 id history', () => {
  const customer = { id: 'cus_1', name: '홍길동' };
  const legacyHistory = [{ id: 1, name: '첫 기록' }];
  const storage = new MockStorage({
    [legacyChartHistoryKey(customer.name)]: JSON.stringify(legacyHistory),
  });

  assert.deepEqual(loadChartHistory(customer, storage), legacyHistory);
  assert.equal(storage.getItem(chartHistoryKey(customer.id)), JSON.stringify(legacyHistory));
});

test('loadChartHistory still accepts pre-v7 history keys', () => {
  const customer = { id: 'cus_2', name: '김철수' };
  const legacyHistory = [{ id: 2, name: '예전 기록' }];
  const storage = new MockStorage({
    [preV7ChartHistoryKey(customer.name)]: JSON.stringify(legacyHistory),
  });

  assert.deepEqual(loadChartHistory(customer, storage), legacyHistory);
  assert.equal(storage.getItem(chartHistoryKey(customer.id)), JSON.stringify(legacyHistory));
});

test('saveChartHistory writes to the id-based v8 key', () => {
  const customer = { id: 'cus_3', name: '이영희' };
  const history = [{ id: 3, name: '저장 기록' }];
  const storage = new MockStorage();

  const savedKey = saveChartHistory(customer, history, storage);

  assert.equal(savedKey, chartHistoryKey(customer.id));
  assert.equal(storage.getItem(savedKey), JSON.stringify(history));
});

test('renameChartHistory preserves migrated history and removes legacy name keys', () => {
  const history = [{ id: 4, name: '개명 전 기록' }];
  const storage = new MockStorage({
    [legacyChartHistoryKey('기존이름')]: JSON.stringify(history),
  });

  const migrated = renameChartHistory({
    id: 'cus_4',
    oldName: '기존이름',
    newName: '새이름',
  }, storage);

  assert.deepEqual(migrated, history);
  assert.equal(storage.getItem(chartHistoryKey('cus_4')), JSON.stringify(history));
  assert.equal(storage.has(legacyChartHistoryKey('기존이름')), false);
});

test('deleteChartHistory removes v8 and legacy keys for a customer', () => {
  const customer = { id: 'cus_5', name: '삭제대상' };
  const storage = new MockStorage({
    [chartHistoryKey(customer.id)]: '[]',
    [legacyChartHistoryKey(customer.name)]: '[]',
    [preV7ChartHistoryKey(customer.name)]: '[]',
  });

  deleteChartHistory(customer, storage);

  assert.equal(storage.has(chartHistoryKey(customer.id)), false);
  assert.equal(storage.has(legacyChartHistoryKey(customer.name)), false);
  assert.equal(storage.has(preV7ChartHistoryKey(customer.name)), false);
});
