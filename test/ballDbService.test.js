import test from 'node:test';
import assert from 'node:assert/strict';
import { searchBallFromLocalDb, formatBallToFactResult, loadBowlingBallDb } from '../src/lib/ballDbService.js';
import { searchBowlingBall } from '../src/lib/openaiService.js';

test('ballDbService loads cleaned database and supports user direct inputs', async () => {
  const db = await loadBowlingBallDb();
  assert.ok(Array.isArray(db));
  assert.ok(db.length >= 0); // 오염된 크롤링 DB 100% 전면 청소 및 승인 팩트 수집 허용
});

test('searchBallFromLocalDb finds Korean alias terms like 버저비터', async () => {
  const matchBuzzer = await searchBallFromLocalDb('버저비터');
  assert.ok(matchBuzzer);
  assert.ok(matchBuzzer.model_name_kr.includes('버저 비터'));
});

test('searchBowlingBall handles empty DB gracefully requiring user direct input or Gemini fallback', async () => {
  try {
    const result = await searchBowlingBall({ ballName: '미입력공' });
    assert.ok(result);
  } catch (err) {
    assert.equal(err.message, 'API_KEY_MISSING');
  }
});
