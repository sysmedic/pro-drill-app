/**
 * 만능 스판 변환기 (Universal Span Converter) 유틸리티
 * 
 * 구면 호(Arc) 물리 계산식과 C-C(Center-to-Center) 허브 법칙을 이용하여
 * Actual Span, Cut to Cut, Center to Center 간의 스판 수치를 변환합니다.
 */

// 볼링공 표준 둘레 (27인치) 및 반지름
export const BALL_CIRCUMFERENCE = 27;
export const BALL_RADIUS = BALL_CIRCUMFERENCE / (2 * Math.PI); // 약 4.297183 인치

/**
 * 평면 반지름(radius)을 볼링공 구면의 호(Arc) 길치로 변환합니다.
 * Arc = BALL_RADIUS * arcsin(radius / BALL_RADIUS)
 */
export function getArc(radius) {
  if (!radius || radius <= 0) return 0;
  const clampedRatio = Math.min(1, Math.max(-1, radius / BALL_RADIUS));
  return BALL_RADIUS * Math.asin(clampedRatio);
}

/**
 * 지공 수치 분수 문자열 (예: "4 3/8", "31/32", "1 1/4", "11/16 (4호)")을 소수(number)인치 수치로 파싱합니다.
 */
export function parseSpanFraction(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;

  // "11/16 (4호)" 등 괄호 주석 제거
  const cleanStr = String(str).split('(')[0].trim();
  if (!cleanStr) return 0;

  const parts = cleanStr.split(/\s+/);
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = parseFloat(parts[0]);
    const fracParts = parts[1].split('/');
    const num = parseFloat(fracParts[0]);
    const den = parseFloat(fracParts[1]);
    if (!isNaN(whole) && !isNaN(num) && !isNaN(den) && den !== 0) {
      return whole + (num / den);
    }
  } else if (parts.length === 1) {
    if (parts[0].includes('/')) {
      const fracParts = parts[0].split('/');
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        return num / den;
      }
    }
    const val = parseFloat(parts[0]);
    return isNaN(val) ? 0 : val;
  }
  return 0;
}

/**
 * 두 수의 최대공약수(GCD)
 */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * 소수점 스판 인치 수치를 지정된 분모 모드(32분법, 16분법 등) 기준 기약분수 문자열로 변환합니다.
 * @param {number} decimalValue 소수점 수치
 * @param {number} denomMode 분모 기준 (기본 32분법)
 */
export function formatFractionByDenom(decimalValue, denomMode = 32) {
  if (!decimalValue || isNaN(decimalValue) || decimalValue <= 0) return '0';

  const denom = Number(denomMode) || 32;
  const roundedParts = Math.round(decimalValue * denom);
  if (roundedParts <= 0) return '0';

  const whole = Math.floor(roundedParts / denom);
  const rem = roundedParts % denom;

  if (rem === 0) {
    return `${whole}`;
  }

  const commonDivisor = gcd(rem, denom);
  const num = rem / commonDivisor;
  const den = denom / commonDivisor;

  if (whole === 0) {
    return `${num}/${den}`;
  }
  return `${whole} ${num}/${den}`;
}

/**
 * 소수점 스판 인치 수치를 지공 표준 64분법 분수 문자열 (예: "4 3/8", "4 15/32")로 변환합니다.
 */
export function formatFraction64(decimalValue) {
  return formatFractionByDenom(decimalValue, 64);
}

/**
 * 손가락/엄지 직경(diameter) 또는 명세 치수를 반경(radius)으로 변환하는 헬퍼
 */
export function getRadiusFromDiameter(diameterStr, defaultDiameter = 0) {
  const val = parseSpanFraction(diameterStr);
  if (val > 0) return val / 2;
  return defaultDiameter / 2;
}

/**
 * 만능 스판 변환기 클래스
 */
export class SpanConverter {
  /**
   * @param {number} fingerDrillRadius 우레탄 바깥쪽 홀 반경 (인치)
   * @param {number} fingerInsertRadius 인서트 안쪽 반경 (인치)
   * @param {number} thumbDrillRadius 엄지 바깥쪽 홀/슬러그 반경 (인치)
   * @param {number} thumbEffectiveRadius 엄지 안쪽/오발 유효 반경 (인치)
   */
  constructor(
    fingerDrillRadius,
    fingerInsertRadius,
    thumbDrillRadius,
    thumbEffectiveRadius
  ) {
    this.fingerDrillArc = getArc(fingerDrillRadius);
    this.fingerInsertArc = getArc(fingerInsertRadius);
    this.thumbDrillArc = getArc(thumbDrillRadius);
    this.thumbEffectiveArc = getArc(thumbEffectiveRadius);
  }

  /**
   * 1. CTC (Cut to Cut) 입력 -> C-C 및 Actual 산출
   */
  fromCTC(ctc) {
    const cc = ctc + this.fingerDrillArc + this.thumbDrillArc;
    const actual = cc - this.fingerInsertArc - this.thumbEffectiveArc;
    return { ctc, cc, actual };
  }

  /**
   * 2. Actual Span 입력 -> C-C 및 CTC 산출
   */
  fromActual(actual) {
    const cc = actual + this.fingerInsertArc + this.thumbEffectiveArc;
    const ctc = cc - this.fingerDrillArc - this.thumbDrillArc;
    return { actual, cc, ctc };
  }

  /**
   * 3. Center to Center 입력 -> CTC 및 Actual 산출
   */
  fromCC(cc) {
    const ctc = cc - this.fingerDrillArc - this.thumbDrillArc;
    const actual = cc - this.fingerInsertArc - this.thumbEffectiveArc;
    return { cc, ctc, actual };
  }

  /**
   * 출처 스판 타입(fromType)에서 목표 스판 타입(toType)으로 스판 수치 연산
   */
  convert(valDecimal, fromType, toType) {
    if (!valDecimal || isNaN(valDecimal) || valDecimal <= 0) return 0;
    if (fromType === toType) return valDecimal;

    let res;
    if (fromType === 'Cut to Cut') {
      res = this.fromCTC(valDecimal);
    } else if (fromType === 'Center to Center') {
      res = this.fromCC(valDecimal);
    } else {
      // 기본: Actual Span
      res = this.fromActual(valDecimal);
    }

    if (toType === 'Cut to Cut') return res.ctc;
    if (toType === 'Center to Center') return res.cc;
    return res.actual; // Actual Span
  }
}

/**
 * 지공 차트 데이터로부터 각 손가락/엄지 반경을 자동 추출하여
 * 출처 스판 타입에서 목표 스판 타입으로 수치를 변환하고 64분법 문자열로 반환합니다.
 */
export function convertSpanValue({
  spanValueStr,
  fromType,
  toType,
  pitchData = {},
  thumbDetails = {},
  denomMode = 32
}) {
  const decimalVal = parseSpanFraction(spanValueStr);
  if (!decimalVal || decimalVal <= 0) return spanValueStr || '';
  if (fromType === toType) return spanValueStr;

  // 1. 손가락 outer drill (기본 31/32")
  const fingerDrillDiam = parseSpanFraction(pitchData?.holeCutSize) || (31 / 32);
  const fingerDrillRadius = fingerDrillDiam / 2;

  // 2. 손가락 inner insert (기본 43/64" ~ 11/16")
  const fingerInsertDiam = parseSpanFraction(pitchData?.insertSize) || (43 / 64);
  const fingerInsertRadius = fingerInsertDiam / 2;

  // 3. 엄지 outer drill/slug (기본 1 1/4" ~ 1.25)
  const thumbDrillDiam = parseSpanFraction(thumbDetails?.holeCutSize) || (1 + 1 / 4);
  const thumbDrillRadius = thumbDrillDiam / 2;

  // 4. 엄지 inner effective (기본 31/32" ~ 63/64")
  const thumbInnerDiam = parseSpanFraction(thumbDetails?.ovalSize) || parseSpanFraction(thumbDetails?.holeSize) || (31 / 32);
  const thumbEffectiveRadius = thumbInnerDiam / 2;

  const converter = new SpanConverter(
    fingerDrillRadius,
    fingerInsertRadius,
    thumbDrillRadius,
    thumbEffectiveRadius
  );

  const convertedDecimal = converter.convert(decimalVal, fromType, toType);
  return formatFractionByDenom(convertedDecimal, denomMode);
}
