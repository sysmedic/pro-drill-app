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

test('loadChartHistory uses non-empty legacy history when v8 history is empty', () => {
  const customer = { id: 'cus_empty', name: '빈브이팔' };
  const legacyHistory = [{ id: 'legacy_1', name: 'legacy 기록' }];
  const storage = new MockStorage({
    [chartHistoryKey(customer.id)]: '[]',
    [legacyChartHistoryKey(customer.name)]: JSON.stringify(legacyHistory),
  });

  assert.deepEqual(loadChartHistory(customer, storage), legacyHistory);
  assert.equal(storage.getItem(chartHistoryKey(customer.id)), JSON.stringify(legacyHistory));
  assert.equal(storage.getItem(legacyChartHistoryKey(customer.name)), JSON.stringify(legacyHistory));
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

test('renameChartHistory merges existing v8 and legacy records before removing legacy keys', () => {
  const primaryHistory = [{ id: 'new', name: 'v8 기록' }];
  const legacyHistory = [{ id: 'old', name: 'legacy 기록' }];
  const storage = new MockStorage({
    [chartHistoryKey('cus_merge')]: JSON.stringify(primaryHistory),
    [legacyChartHistoryKey('기존이름')]: JSON.stringify(legacyHistory),
  });

  const migrated = renameChartHistory({
    id: 'cus_merge',
    oldName: '기존이름',
    newName: '새이름',
  }, storage);

  const mergedHistory = [...primaryHistory, ...legacyHistory];
  assert.deepEqual(migrated, mergedHistory);
  assert.equal(storage.getItem(chartHistoryKey('cus_merge')), JSON.stringify(mergedHistory));
  assert.equal(storage.has(legacyChartHistoryKey('기존이름')), false);
});

test('renameChartHistory keeps legacy keys when primary write fails', () => {
  class FailingStorage extends MockStorage {
    setItem() {
      throw new Error('quota exceeded');
    }
  }

  const legacyHistory = [{ id: 'legacy_safe', name: '보존 기록' }];
  const storage = new FailingStorage({
    [legacyChartHistoryKey('기존이름')]: JSON.stringify(legacyHistory),
  });

  assert.deepEqual(renameChartHistory({
    id: 'cus_fail',
    oldName: '기존이름',
    newName: '새이름',
  }, storage), legacyHistory);
  assert.equal(storage.getItem(legacyChartHistoryKey('기존이름')), JSON.stringify(legacyHistory));
});

test('renameChartHistory does not remove malformed legacy keys while migrating readable history', () => {
  const readableHistory = [{ id: 'legacy_readable', name: '읽을 수 있는 기록' }];
  const malformedHistory = '[{"id":"legacy_malformed"';
  const storage = new MockStorage({
    [legacyChartHistoryKey('기존이름')]: malformedHistory,
    [preV7ChartHistoryKey('기존이름')]: JSON.stringify(readableHistory),
  });

  assert.deepEqual(renameChartHistory({
    id: 'cus_malformed_rename',
    oldName: '기존이름',
    newName: '새이름',
  }, storage), readableHistory);
  assert.equal(storage.getItem(chartHistoryKey('cus_malformed_rename')), JSON.stringify(readableHistory));
  assert.equal(storage.getItem(legacyChartHistoryKey('기존이름')), malformedHistory);
  assert.equal(storage.has(preV7ChartHistoryKey('기존이름')), false);
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

test('deleteChartHistory preserves non-empty legacy history that differs from v8 history', () => {
  const customer = { id: 'cus_preserve', name: '동명이인' };
  const primaryHistory = [{ id: 'v8', name: 'id 기반 기록' }];
  const legacyHistory = [{ id: 'legacy', name: '이름 기반 기록' }];
  const storage = new MockStorage({
    [chartHistoryKey(customer.id)]: JSON.stringify(primaryHistory),
    [legacyChartHistoryKey(customer.name)]: JSON.stringify(legacyHistory),
  });

  deleteChartHistory(customer, storage);

  assert.equal(storage.has(chartHistoryKey(customer.id)), false);
  assert.equal(storage.getItem(legacyChartHistoryKey(customer.name)), JSON.stringify(legacyHistory));
});

test('deleteChartHistory preserves malformed legacy history for manual recovery', () => {
  const customer = { id: 'cus_malformed_delete', name: '복구대상' };
  const malformedHistory = '[{"id":"broken"';
  const storage = new MockStorage({
    [chartHistoryKey(customer.id)]: '[]',
    [legacyChartHistoryKey(customer.name)]: malformedHistory,
  });

  deleteChartHistory(customer, storage);

  assert.equal(storage.has(chartHistoryKey(customer.id)), false);
  assert.equal(storage.getItem(legacyChartHistoryKey(customer.name)), malformedHistory);
});
