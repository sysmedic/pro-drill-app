import { BALL_RADIUS, parseSpanFraction, formatFractionByDenom, SpanConverter } from './spanConverter.js';

/**
 * 📐 구면 기하학 기반 지공 미드라인 연산 유틸리티
 * 
 * 중지/약지 스판 및 브릿지 간격을 바탕으로 구면 삼각법(Spherical Trigonometry) 수식을 적용하여
 * 5가지 마킹 수치를 정밀 연산합니다:
 * 1) 미드라인 - 엄지 마킹 (dNT / 2)
 * 2) 엄지 마킹 - 중지 마킹 (dMT)
 * 3) 엄지 마킹 - 약지 마킹 (dRT)
 * 4) 센터라인 - 중지 마킹 (dMR / 2)
 * 5) 중지 마킹 - 약지 마킹 (dMR)
 */
export function calculateSphericalMidline({
  midSpanStr,
  ringSpanStr,
  bridgeDiamStr = '3/16',
  fromType = 'Actual Span',
  markingType = 'Cut to Cut',
  fingerDrillDiamStr = '31/32',
  fingerInsertDiamStr = '43/64',
  thumbDrillDiamStr = '1 1/4',
  thumbEffectiveDiamStr = '31/32',
  ovalCutDiamStr = '',
  ovalAngleDeg = 0,
  denomMode = 32,
}) {
  const midValDecimal = parseSpanFraction(midSpanStr);
  const ringValDecimal = parseSpanFraction(ringSpanStr);

  if (!midValDecimal && !ringValDecimal) {
    return {
      dNTHalfFormatted: '-',
      dMTFormatted: '-',
      dRTFormatted: '-',
      dCenterlineMidFormatted: '-',
      dMRFormatted: '-',
      dCenterlineMidCCFormatted: '-',
      dMRCCFormatted: '-',
      markingType,
      fromType,
    };
  }

  // 1. 홀 반경 파싱
  const fingerDrillRadius = (parseSpanFraction(fingerDrillDiamStr) || (31 / 32)) / 2;
  const fingerInsertRadius = (parseSpanFraction(fingerInsertDiamStr) || (43 / 64)) / 2;
  const thumbDrillRadius = (parseSpanFraction(thumbDrillDiamStr) || (1 + 1 / 4)) / 2;

  const ovalCutDiam = parseSpanFraction(ovalCutDiamStr) || parseSpanFraction(thumbEffectiveDiamStr) || (31 / 32);
  const ovalMajorDiam = parseSpanFraction(thumbEffectiveDiamStr) || ovalCutDiam;
  const angleDeg = parseFloat(ovalAngleDeg) || 0;
  const rad = (angleDeg * Math.PI) / 180;

  const rMinor = ovalCutDiam / 2;
  const rMajor = ovalMajorDiam / 2;

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

  // 2. 입력받은 스판을 Center-to-Center (C-C) 호거리로 변환
  const dMT_CC = midValDecimal ? converter.convert(midValDecimal, fromType, 'Center to Center') : 0;
  const dRT_CC = ringValDecimal ? converter.convert(ringValDecimal, fromType, 'Center to Center') : 0;

  // 중지-약지 C-C 호거리 dMR_CC = 브릿지 간격 + (핑거 홀 드릴 반경 * 2)
  const bridgeVal = parseSpanFraction(bridgeDiamStr) || (3 / 16);
  const dMR_CC = bridgeVal + (fingerDrillRadius * 2);

  // 3. 선택한 '마킹 방식 (Marking Method)' 기준 변환
  const dMT_Final = midValDecimal ? converter.convert(midValDecimal, fromType, markingType) : 0;
  const dRT_Final = ringValDecimal ? converter.convert(ringValDecimal, fromType, markingType) : 0;

  let dMR_Final = dMR_CC;
  if (markingType === 'Cut to Cut') {
    dMR_Final = Math.max(0, dMR_CC - (fingerDrillRadius * 2));
  }

  // 4. 구면삼각형 중선각(theta_NT) 도출 (볼 반지름 R = 27 / 2π)
  const R = BALL_RADIUS;
  const thetaMT = dMT_CC / R;
  const thetaRT = dRT_CC / R;
  const thetaMR = dMR_CC / R;

  const num = Math.cos(thetaMT) + Math.cos(thetaRT);
  const den = 2 * Math.cos(thetaMR / 2);

  let thetaNT = 0;
  if (den !== 0) {
    const ratio = Math.min(1, Math.max(-1, num / den));
    thetaNT = Math.acos(ratio);
  }

  const dNT_CC = R * thetaNT;

  let dNT_Final = dNT_CC;
  if (markingType === 'Cut to Cut') {
    dNT_Final = Math.max(0, dNT_CC - fingerDrillRadius - thumbDrillRadius);
  } else if (markingType === 'Actual Span') {
    dNT_Final = Math.max(0, dNT_CC - fingerInsertRadius - thumbEffectiveRadius);
  }

  // 5. 5가지 표출 수치 및 센터 투 센터 기준 2종 추출 수치 연산
  const dNTHalfVal = dNT_Final / 2;
  const dCenterlineMidVal = dMR_Final / 2;

  const dMRCCVal = dMR_CC;
  const dCenterlineMidCCVal = dMR_CC / 2;

  return {
    // 1) 미드라인 - 엄지 마킹
    dNTHalfFormatted: formatFractionByDenom(dNTHalfVal, denomMode),
    dNTFormatted: formatFractionByDenom(dNT_Final, denomMode),

    // 2) 엄지 마킹 - 중지 마킹
    dMTFormatted: formatFractionByDenom(dMT_Final, denomMode),

    // 3) 엄지 마킹 - 약지 마킹
    dRTFormatted: formatFractionByDenom(dRT_Final, denomMode),

    // 4) 센터라인 - 중지 마킹
    dCenterlineMidFormatted: formatFractionByDenom(dCenterlineMidVal, denomMode),

    // 5) 중지 마킹 - 약지 마킹
    dMRFormatted: formatFractionByDenom(dMR_Final, denomMode),

    // 6) 📌 Center to Center 기준 2종 추가 수치
    dCenterlineMidCCFormatted: formatFractionByDenom(dCenterlineMidCCVal, denomMode),
    dMRCCFormatted: formatFractionByDenom(dMRCCVal, denomMode),

    radius: R.toFixed(5),
    markingType,
    fromType,
  };
}
