import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getCustomerChartProfile,
  getCustomerHandedness,
  isThumblessCustomer,
} from '../src/lib/customerSchema.js';

test('left-handed customers are detected from Korean hand labels', () => {
  assert.equal(getCustomerHandedness({ hand: '왼손' }), 'left');
  assert.equal(getCustomerHandedness({ hand: '좌투' }), 'left');
  assert.equal(getCustomerHandedness({ hand: '오른손' }), 'right');
});

test('thumbless chart mode follows both 덤리스 and 투핸드 styles', () => {
  assert.equal(isThumblessCustomer({ style: '덤리스' }), true);
  assert.equal(isThumblessCustomer({ style: '투핸드' }), true);
  assert.equal(isThumblessCustomer({ hand: '투핸드' }), true);
  assert.equal(isThumblessCustomer({ style: '스트로커' }), false);
});

test('chart profile combines handedness and thumbless defaults', () => {
  assert.deepEqual(getCustomerChartProfile({ hand: '왼손', style: '투핸드' }), {
    handedness: 'left',
    isThumbless: true,
  });
});
