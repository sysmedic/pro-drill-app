/**
 * 만능 스판 변환기 (Universal Span Converter) 유틸리티
 * 
 * 구면 호(Arc) 물리 계산식과 C-C(Center-to-Center) 허브 법칙,
 * 그리고 오발 각도(Oval Angle) 타원 투영 수식을 이용하여
 * Actual Span, Cut to Cut, Center to Center 간의 스판 수치를 정밀 변환합니다.
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

export function formatFraction64(decimalValue) {
  return formatFractionByDenom(decimalValue, 64);
}

export class SpanConverter {
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

  fromCTC(ctc) {
    const cc = ctc + this.fingerDrillArc + this.thumbDrillArc;
    const actual = cc - this.fingerInsertArc - this.thumbEffectiveArc;
    return { ctc, cc, actual };
  }

  fromActual(actual) {
    const cc = actual + this.fingerInsertArc + this.thumbEffectiveArc;
    const ctc = cc - this.fingerDrillArc - this.thumbDrillArc;
    return { actual, cc, ctc };
  }

  fromCC(cc) {
    const ctc = cc - this.fingerDrillArc - this.thumbDrillArc;
    const actual = cc - this.fingerInsertArc - this.thumbEffectiveArc;
    return { cc, ctc, actual };
  }

  convert(valDecimal, fromType, toType) {
    if (!valDecimal || isNaN(valDecimal) || valDecimal <= 0) return 0;
    if (fromType === toType) return valDecimal;

    let res;
    if (fromType === 'Cut to Cut') {
      res = this.fromCTC(valDecimal);
    } else if (fromType === 'Center to Center') {
      res = this.fromCC(valDecimal);
    } else {
      res = this.fromActual(valDecimal);
    }

    if (toType === 'Cut to Cut') return res.ctc;
    if (toType === 'Center to Center') return res.cc;
    return res.actual;
  }
}

export function convertSpanValue({
  spanValueStr,
  spanVal,
  fromType,
  toType,
  fingerDrillDiamStr = '31/32',
  fingerInsertDiamStr = '43/64',
  thumbDrillDiamStr = '1 1/4',
  thumbEffectiveDiamStr = '31/32',
  ovalCutDiamStr = '',
  ovalAngleDeg = 0,
  denomMode = 32
}) {
  const targetStr = spanValueStr || spanVal || '';
  const decimalVal = parseSpanFraction(targetStr);
  if (!decimalVal || decimalVal <= 0) return targetStr || '';
  if (fromType === toType) return targetStr;

  const fingerDrillRadius = (parseSpanFraction(fingerDrillDiamStr) || (31 / 32)) / 2;
  const fingerInsertRadius = (parseSpanFraction(fingerInsertDiamStr) || (43 / 64)) / 2;
  const thumbDrillRadius = (parseSpanFraction(thumbDrillDiamStr) || (1 + 1 / 4)) / 2;

  // 📐 타원 투영 수식: 오발 각도(ovalAngleDeg) 반영
  const ovalCutDiam = parseSpanFraction(ovalCutDiamStr) || parseSpanFraction(thumbEffectiveDiamStr) || (31 / 32);
  const ovalMajorDiam = parseSpanFraction(thumbEffectiveDiamStr) || ovalCutDiam;
  const angleDeg = parseFloat(ovalAngleDeg) || 0;
  const rad = (angleDeg * Math.PI) / 180;

  const rMinor = ovalCutDiam / 2;
  const rMajor = ovalMajorDiam / 2;

  // 센터라인(Centerline) 상의 타원 투영 유효 엄지 반경
  let thumbEffectiveRadius = rMajor;
  if (angleDeg !== 0 || ovalCutDiam !== ovalMajorDiam) {
    thumbEffectiveRadius = Math.sqrt(
      Math.pow(rMinor * Math.cos(rad), 2) + Math.pow(rMajor * Math.sin(rad), 2)
    );
  }

  const converter = new SpanConverter(
    fingerDrillRadius,
    fingerInsertRadius,
    thumbDrillRadius,
    thumbEffectiveRadius
  );

  const convertedDecimal = converter.convert(decimalVal, fromType, toType);
  return formatFractionByDenom(convertedDecimal, denomMode);
}
