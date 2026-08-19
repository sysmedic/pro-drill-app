import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BALL_RADIUS,
  getArc,
  parseSpanFraction,
  formatFraction64,
  formatFractionByDenom,
  SpanConverter,
  convertSpanValue
} from '../src/lib/spanConverter.js';

test('formatFractionByDenom formats decimals to 32th and 16th reduced fractions', () => {
  assert.equal(formatFractionByDenom(4.375, 32), '4 3/8');
  assert.equal(formatFractionByDenom(4.375, 16), '4 3/8');
  assert.equal(formatFractionByDenom(4.03125, 32), '4 1/32');
  assert.equal(formatFractionByDenom(4.0625, 16), '4 1/16');
});

test('BALL_RADIUS calculation check', () => {
  assert.ok(Math.abs(BALL_RADIUS - (27 / (2 * Math.PI))) < 1e-6);
});

test('getArc produces correct spherical arc length', () => {
  const r = 0.5; // 1/2 인치 반지름
  const arc = getArc(r);
  assert.ok(arc > r, 'Spherical arc length must be slightly larger than flat radius');
  assert.ok(arc < r * 1.1, 'Arc should not be excessively larger than flat radius');
});

test('parseSpanFraction parses fractions and strings correctly', () => {
  assert.equal(parseSpanFraction('4 3/8'), 4.375);
  assert.equal(parseSpanFraction('31/32'), 31 / 32);
  assert.equal(parseSpanFraction('1 1/4'), 1.25);
  assert.equal(parseSpanFraction('11/16 (4호)'), 11 / 16);
  assert.equal(parseSpanFraction(''), 0);
});

test('formatFraction64 formats decimals to 64th fractions', () => {
  assert.equal(formatFraction64(4.375), '4 3/8');
  assert.equal(formatFraction64(4.5), '4 1/2');
  assert.equal(formatFraction64(0.96875), '31/32');
});

test('SpanConverter hub law: CTC < C-C and Actual < C-C', () => {
  const fingerDrillRadius = 31 / 64;   // 31/32" outer hole
  const fingerInsertRadius = 11 / 32;  // 11/16" inner insert
  const thumbDrillRadius = 5 / 8;      // 1 1/4" outer slug
  const thumbEffectiveRadius = 31 / 64; // 31/32" inner thumb

  const converter = new SpanConverter(
    fingerDrillRadius,
    fingerInsertRadius,
    thumbDrillRadius,
    thumbEffectiveRadius
  );

  const ctcInput = 4.375; // 4 3/8" CTC
  const res = converter.fromCTC(ctcInput);

  assert.ok(res.cc > res.ctc, 'C-C must be greater than CTC');
  assert.ok(res.cc > res.actual, 'C-C must be greater than Actual');

  // Reverse calculation check
  const backToCtc = converter.convert(res.actual, 'Actual Span', 'Cut to Cut');
  assert.ok(Math.abs(backToCtc - ctcInput) < 1e-4, 'Reversible conversion must restore original value');
});

test('convertSpanValue helper returns correct 64th fraction string', () => {
  const converted = convertSpanValue({
    spanValueStr: '4 3/8',
    fromType: 'Cut to Cut',
    toType: 'Center to Center'
  });

  assert.ok(typeof converted === 'string');
  assert.notEqual(converted, '4 3/8', 'Converting Cut to Cut to Center to Center should change span value');
});
