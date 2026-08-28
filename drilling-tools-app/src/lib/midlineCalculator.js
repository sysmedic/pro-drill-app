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
  fingerDrillDiamStr = '31/32',      // 중지 홀컷
  ringDrillDiamStr = null,            // 약지 홀컷 (null이면 중지 홀컷과 동일 처리)
  fingerInsertDiamStr = '43/64',
  thumbDrillDiamStr = '1 1/4',
  thumbEffectiveDiamStr = '31/32',
  ovalCutDiamStr = '',
  ovalAngleDeg = 0,
  midTipType = '',
  ringTipType = '',
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
  const midDrillRadius   = (parseSpanFraction(fingerDrillDiamStr) || (31 / 32)) / 2;
  // 약지 홀컷이 별도로 지정되지 않으면 중지 홀컷과 동일하게 처리
  const ringDrillRadius  = ringDrillDiamStr
    ? (parseSpanFraction(ringDrillDiamStr) || midDrillRadius * 2) / 2
    : midDrillRadius;
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

  // 2. 팁 종류(Tip Type)가 반영된 진정한 'Actual Span'을 산출한 뒤 C-C 호거리로 변환
  // 중지 스판 변환: 중지 홀컷 및 중지 팁 기준
  const converterMid = new SpanConverter(
    midDrillRadius,
    fingerInsertRadius,
    thumbDrillRadius,
    thumbEffectiveRadius
  );
  // 약지 스판 변환: 약지 홀컷 및 약지 팁 기준
  const converterRing = new SpanConverter(
    ringDrillRadius,
    fingerInsertRadius,
    thumbDrillRadius,
    thumbEffectiveRadius
  );

  // 📌 모든 미드라인은 팁 보정(Semi +3/32, Tip +1/8, Oval +0)이 가산된 엑추얼 스판을 절대 기준으로 연산
  const midActualVal = midValDecimal ? converterMid.convert(midValDecimal, fromType, 'Actual Span', midTipType) : 0;
  const ringActualVal = ringValDecimal ? converterRing.convert(ringValDecimal, fromType, 'Actual Span', ringTipType) : 0;

  // 팁 보정 엑추얼 스판 기준 Center-to-Center (C-C) 호거리 변환
  const dMT_CC = midActualVal  ? converterMid.convert(midActualVal,  'Actual Span', 'Center to Center') : 0;
  const dRT_CC = ringActualVal ? converterRing.convert(ringActualVal, 'Actual Span', 'Center to Center') : 0;

  // 중지-약지 C-C 호거리: 브릿지 간격 + 중지 반경 + 약지 반경
  const bridgeVal = parseSpanFraction(bridgeDiamStr) || (3 / 16);
  const dMR_CC = bridgeVal + midDrillRadius + ringDrillRadius;

  // 3. 선택한 '마킹 방식 (Marking Method)' 기준 변환 (팁 보정된 엑추얼 스판 기준)
  const dMT_Final  = midActualVal  ? converterMid.convert(midActualVal,  'Actual Span', markingType) : 0;
  const dRT_Final  = ringActualVal ? converterRing.convert(ringActualVal, 'Actual Span', markingType) : 0;

  let dMR_Final = dMR_CC;
  if (markingType === 'Cut to Cut') {
    dMR_Final = Math.max(0, dMR_CC - midDrillRadius - ringDrillRadius);
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

  // 중선 C-C 호거리 및 실제 손 그립 엑추얼 스판(dNT_Actual) 도출
  const dNT_CC = R * thetaNT;
  const dNT_Actual = converterMid.convert(dNT_CC, 'Center to Center', 'Actual Span');
  const dNT_Actual_Half = dNT_Actual / 2;

  // 📌 [지공사님 절대 기준]: 미드라인 위치는 무조건 실제 손 그립(Actual)의 1/2에 고정
  // 1) 컷투컷 마킹: 미드라인 - (엄지 슬러그 반경 - 엄지 오발 반경)
  // 2) C-C 마킹: 미드라인 + 엄지 오발 반경
  let dNTHalfVal = dNT_Actual_Half;
  let dNT_Final = dNT_Actual;

  if (markingType === 'Cut to Cut') {
    const thumbAllowance = Math.max(0, thumbDrillRadius - thumbEffectiveRadius);
    dNTHalfVal = Math.max(0, dNT_Actual_Half - thumbAllowance);
    dNT_Final = dNTHalfVal * 2;
  } else if (markingType === 'Center to Center') {
    dNTHalfVal = dNT_Actual_Half + thumbEffectiveRadius;
    dNT_Final = dNTHalfVal * 2;
  }

  // 5. 5가지 표출 수치 및 센터 투 센터 기준 2종 추출 수치 연산
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

    // 7) 📌 산출 근거 1:1 증빙 상세 수치
    midActualFormatted: formatFractionByDenom(midActualVal, denomMode),
    ringActualFormatted: formatFractionByDenom(ringActualVal, denomMode),
    dNTActualFormatted: formatFractionByDenom(dNT_Actual, denomMode),
    dNTActualHalfFormatted: formatFractionByDenom(dNT_Actual_Half, denomMode),
    thumbAllowanceFormatted: formatFractionByDenom(Math.max(0, thumbDrillRadius - thumbEffectiveRadius), denomMode),
    thumbEffectiveRadiusFormatted: formatFractionByDenom(thumbEffectiveRadius, denomMode),

    radius: R.toFixed(5),
    markingType,
    fromType,
  };
}
