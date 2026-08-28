import { parseSpanFraction } from './spanConverter.js';

export const PITCH_OPTIONS = [
  "0", "1/16", "1/8", "3/16", "1/4", "5/16", "3/8", "7/16", "1/2",
  "9/16", "5/8", "11/16", "3/4", "13/16", "7/8", "15/16", "1"
];
export const PITCH_OPTIONS_32 = [
  "0", "1/32", "1/16", "3/32", "1/8", "5/32", "3/16", "7/32", "1/4", "9/32", "5/16", "11/32", "3/8", "13/32", "7/16", "15/32",
  "1/2", "17/32", "9/16", "19/32", "5/8", "21/32", "11/16", "23/32", "3/4", "25/32", "13/16", "27/32", "7/8", "29/32", "15/16", "31/32", "1"
];
export const SPAN_TYPE_OPTIONS = ["Actual Span", "Cut to Cut", "Center to Center"];
export const MARKING_TYPE_OPTIONS = ["Cut to Cut", "Center to Center"];
export const BRIDGE_OPTIONS = ["1/8", "3/16", "1/4", "5/16", "직접입력"];
export const TIP_TYPE_OPTIONS = ["", "Semi", "Tip", "Oval"];
export const LATERAL_DIR_OPTIONS = [{ value: 'left', label: '◀ Left' }, { value: 'right', label: 'Right ▶' }];
export const THUMB_VERTICAL_DIR_OPTIONS = [{ value: 'reverse', label: '▼ Reverse' }, { value: 'forward', label: '▲ Forward' }];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export const getReducedFraction = (num, den) => {
  const div = gcd(num, den);
  const n = num / div;
  const d = den / div;
  if (d === 1) return `${n}`;
  if (n > d) {
    const whole = Math.floor(n / d);
    const rem = n % d;
    return rem === 0 ? `${whole}` : `${whole} ${rem}/${d}`;
  }
  return `${n}/${d}`;
};

export const generateFractions = (startNum, endNum, den = 64) => {
  const res = [];
  for (let i = startNum; i <= endNum; i++) res.push(getReducedFraction(i, den));
  return res;
};

export const MID_HOLE_CUT_OPTIONS = ["7/8", "31/32", "1 1/32"];
export const RING_HOLE_CUT_OPTIONS = ["7/8", "31/32", "1 1/32"];
export const THUMB_HOLE_CUT_OPTIONS = ["1 1/8", "1 1/4", "1 3/8", "1 1/2"];

export const FINGER_INSERT_OPTIONS = [
  "17/32 (0호)",
  "9/16 (0.5호)",
];
for (let i = 38; i <= 58; i++) {
  FINGER_INSERT_OPTIONS.push(`${getReducedFraction(i, 64)} (${1 + (i - 38) * 0.5}호)`);
}

export const HOLE_OPTIONS = generateFractions(32, 64);
export const ALL_OVAL_OPTIONS = generateFractions(32, 80);

/**
 * 📌 오발 컷 (Oval Cut) 드릴 비트 수치 옵션:
 * 원홀(holeSizeStr) 수치 포함 아래(작은) 방향으로 정확히 11개 수치 (holeSize ~ holeSize - 10/64)
 */
export function getOvalCutOptions(holeSizeStr) {
  const baseNum = parseSpanFraction(holeSizeStr);
  if (!baseNum || baseNum <= 0) {
    return HOLE_OPTIONS;
  }

  const base64 = Math.round(baseNum * 64);
  const filtered = [];
  for (let i = 0; i <= 10; i++) {
    const target64 = base64 - i;
    if (target64 > 0) {
      filtered.push(getReducedFraction(target64, 64));
    }
  }
  return filtered;
}

/**
 * 📌 오발 크기 (Oval Size) 가공 수치 옵션:
 * 원홀(holeSizeStr) 직후(+1/64)부터 위(큰) 방향으로 20개 수치 (holeSize + 1/64 ~ holeSize + 20/64)
 */
export function getDynamicOvalOptions(holeSizeStr) {
  const baseNum = parseSpanFraction(holeSizeStr);
  if (!baseNum || baseNum <= 0) {
    return generateFractions(33, 52);
  }

  const start64 = Math.round(baseNum * 64) + 1;
  const filtered = [];
  for (let i = start64; i < start64 + 20; i++) {
    filtered.push(getReducedFraction(i, 64));
  }
  return filtered;
}
