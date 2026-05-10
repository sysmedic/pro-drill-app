import test from 'node:test';
import assert from 'node:assert/strict';

import { createLocalId } from '../src/lib/ids.js';

test('createLocalId returns prefixed unique ids', () => {
  const first = createLocalId('cus');
  const second = createLocalId('cus');

  assert.match(first, /^cus_[A-Za-z0-9_-]+$/);
  assert.match(second, /^cus_[A-Za-z0-9_-]+$/);
  assert.notEqual(first, second);
});

test('createLocalId normalizes unsafe prefixes', () => {
  assert.match(createLocalId('memo note'), /^memo_note_[A-Za-z0-9_-]+$/);
});
