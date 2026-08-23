import { parseSpanFraction, formatFractionByDenom } from './spanConverter.js';

const toFraction64 = (num) => formatFractionByDenom(num, 64);

const formatNum = (num) => {
  if (isNaN(num)) return '-';
  if (Math.abs(num) < 0.0005) return '0.000';
  return num.toFixed(3);
};

/**
 * 🔒 제원 상태 데이터를 URL-safe Base64 문자열로 인코딩 (보정값 0 기본화)
 */
export function encodeSharePayload(state) {
  try {
    const copy = JSON.parse(JSON.stringify(state));
    // 📌 [지공사님 핵심 지침]: 공유 시 보정값은 "0"을 기본으로 설정
    copy.ovalCorrection = '0';
    const jsonStr = JSON.stringify(copy);
    const utf8Bytes = encodeURIComponent(jsonStr);
    return btoa(utf8Bytes);
  } catch (e) {
    console.error('Failed to encode share payload', e);
    return '';
  }
}

/**
 * 🔓 Base64 문자열을 원본 제원 데이터로 디코딩
 */
export function decodeSharePayload(base64Str) {
  try {
    const decodedUtf8 = atob(base64Str);
    const jsonStr = decodeURIComponent(decodedUtf8);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to decode share payload', e);
    return null;
  }
}

/**
 * 📐 보정값 "0" 기준 엄지 오발 피치 매트릭스 계산기
 */
export function computeOvalMatrixForShare(state) {
  const {
    holeSize = '',
    ovalSize = '',
    ovalCut = '',
    ovalCut1: rawOvalCut1 = '',
    ovalCut2: rawOvalCut2 = '',
    ovalAngle = '0',
    latDir = '',
    latVal = '',
    vertDir = '',
    vertVal = '',
    isLeftHanded = false,
    isDetailedMode = false,
    extraBitCount = 0,
    bitCustomSizes = {},
    bitCustomOffsets = {},
  } = state || {};

  const ovalCut1 = rawOvalCut1 || ovalCut;
  const ovalCut2 = rawOvalCut2 || ovalCut || ovalCut1;

  const baseHoleSizeNum = parseSpanFraction(holeSize);
  const ovalCutNum1 = parseSpanFraction(holeSize ? ovalCut1 : '');
  const ovalCutNum2 = parseSpanFraction(holeSize ? ovalCut2 : '');
  const oval = parseSpanFraction(holeSize ? ovalSize : '');
  // 📌 공유 시 보정값 0 고정
  const correction = 0;
  const angle = parseFloat(ovalAngle) || 0;
  const radians = (angle * Math.PI) / 180;
  const handMultiplier = isLeftHanded ? -1 : 1;

  const pitchDown = vertDir === 'reverse' && vertVal !== '' ? vertVal : '';
  const pitchUp = vertDir === 'forward' && vertVal !== '' ? vertVal : '';
  const pitchLeft = latDir === 'left' && latVal !== '' ? latVal : '';
  const pitchRight = latDir === 'right' && latVal !== '' ? latVal : '';

  const thumbVertical =
    (pitchDown ? parseSpanFraction(pitchDown) : 0) -
    (pitchUp ? parseSpanFraction(pitchUp) : 0);

  const thumbHorizontal =
    (pitchLeft ? parseSpanFraction(pitchLeft) : 0) -
    (pitchRight ? parseSpanFraction(pitchRight) : 0);

  const baseBitsCount = isDetailedMode ? 5 : 3;
  const totalActiveBits = Math.min(7, baseBitsCount + (extraBitCount || 0));

  if (!baseHoleSizeNum || !oval || !ovalCutNum1 || !ovalCutNum2) {
    return [];
  }

  const rows = [];
  for (let rowIndex = 1; rowIndex <= totalActiveBits; rowIndex++) {
    // 1) 비트 사이즈
    let bitSize = '-';
    if (bitCustomSizes[rowIndex]) {
      bitSize = bitCustomSizes[rowIndex];
    } else if (rowIndex === totalActiveBits) {
      bitSize = toFraction64(baseHoleSizeNum);
    } else if (rowIndex === 1) {
      bitSize = toFraction64(ovalCutNum1);
    } else if (rowIndex === 2) {
      bitSize = toFraction64(ovalCutNum2);
    } else if (rowIndex === 3) {
      bitSize = toFraction64((ovalCutNum2 + baseHoleSizeNum) / 2);
    } else if (rowIndex === 4) {
      bitSize = toFraction64((ovalCutNum1 + baseHoleSizeNum) / 2);
    } else if (rowIndex >= 5) {
      bitSize = toFraction64(ovalCutNum1);
    }

    // 2) 수평 피치
    const customOffX = (bitCustomOffsets[rowIndex] && bitCustomOffsets[rowIndex].x) || 0;
    const calcValue1 = (((oval - ovalCutNum1) / 2) + correction) * Math.cos(radians) * handMultiplier;
    const calcValue2 = (((oval - ovalCutNum2) / 2) + correction) * Math.cos(radians) * handMultiplier;

    let baseH = 0;
    if (rowIndex === 1) baseH = thumbHorizontal + calcValue1;
    else if (rowIndex === 2) baseH = thumbHorizontal - calcValue2;
    else if (rowIndex === 3) baseH = thumbHorizontal - (calcValue2 / 2);
    else if (rowIndex === 4) baseH = thumbHorizontal + (calcValue1 / 2);
    else if (rowIndex >= 5 && rowIndex < totalActiveBits) baseH = thumbHorizontal + calcValue1;
    else if (rowIndex === totalActiveBits) baseH = thumbHorizontal;

    const horizPitch = formatNum(baseH + customOffX);

    // 3) 수직 피치
    const customOffY = (bitCustomOffsets[rowIndex] && bitCustomOffsets[rowIndex].y) || 0;
    const vCalcValue1 = (((oval - ovalCutNum1) / 2) + correction) * Math.sin(radians);
    const vCalcValue2 = (((oval - ovalCutNum2) / 2) + correction) * Math.sin(radians);

    let baseV = 0;
    if (rowIndex === 1) baseV = thumbVertical + vCalcValue1;
    else if (rowIndex === 2) baseV = thumbVertical - vCalcValue2;
    else if (rowIndex === 3) baseV = thumbVertical - (vCalcValue2 / 2);
    else if (rowIndex === 4) baseV = thumbVertical + (vCalcValue1 / 2);
    else if (rowIndex >= 5 && rowIndex < totalActiveBits) baseV = thumbVertical + vCalcValue1;
    else if (rowIndex === totalActiveBits) baseV = thumbVertical;

    const vertPitch = formatNum(baseV + customOffY);

    rows.push({
      index: rowIndex,
      bitSize,
      horizPitch,
      vertPitch,
    });
  }

  return rows;
}

/**
 * 📁 텍스트 파일(.txt) 브라우저 다운로드 유틸리티
 */
export function downloadTextFile(filename, text) {
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('File download failed', err);
  }
}

/**
 * 📝 카카오톡/문자 전송 및 텍스트 파일 저장용 순수 지공 제원표 텍스트 생성 (링크 삭제)
 */
export function generateShareText(title, state) {
  const {
    midSpanStr = '',
    ringSpanStr = '',
    midHoleCut = '31/32',
    ringHoleCut = '31/32',
    bridgeStr = '1/4',
    thumbAngle = '45',
    fromType = 'Actual Span',
    toType = 'Center to Center',
    markingType = 'Cut to Cut',
    thumbHoleCut = '1 1/4',
    holeSize = '',
    ovalSize = '',
    ovalCut = '',
    ovalCut1 = '',
    ovalCut2 = '',
    ovalAngle = '0',
    latDir = '',
    latVal = '',
    vertDir = '',
    vertVal = '',
    isLeftHanded = false,
  } = state || {};

  const matrixRows = computeOvalMatrixForShare(state);
  const handStr = isLeftHanded ? '왼손 (Left)' : '오른손 (Right)';

  let text = `🎳 [ProDrill Tools 지공 제원표]\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `■ 슬롯명: ${title || '제원 저장본'}\n`;
  text += `■ 손구분: ${handStr}\n\n`;

  // 1. 스판 제원
  text += `[1. 스판 & 미드라인]\n`;
  text += `• 중지: ${midSpanStr || '-'} (홀: ${midHoleCut})\n`;
  text += `• 약지: ${ringSpanStr || '-'} (홀: ${ringHoleCut})\n`;
  text += `• 브릿지: ${bridgeStr} | 엄지 각도: ${thumbAngle}°\n`;
  text += `• 스판 기준: ${fromType} ➔ ${toType} (${markingType})\n\n`;

  // 2. 엄지 제원
  text += `[2. 엄지 기본 & 피치]\n`;
  text += `• 슬러그 홀컷: ${thumbHoleCut}\n`;
  text += `• 원홀/오발: ${holeSize || '-'} x ${ovalSize || '-'}\n`;
  const cutDisplay = ovalCut1 && ovalCut2 && ovalCut1 !== ovalCut2 
    ? `컷1: ${ovalCut1} / 컷2: ${ovalCut2}` 
    : `오발컷: ${ovalCut1 || ovalCut || '-'}`;
  text += `• ${cutDisplay} @ ${ovalAngle}°\n`;

  const latStr = latDir && latVal ? `${latVal} ${latDir}` : '0';
  const vertStr = vertDir && vertVal ? `${vertVal} ${vertDir}` : '0';
  text += `• 엄지 피치: ${latStr} / ${vertStr}\n`;
  text += `• 적용 보정값: 0 (표준)\n\n`;

  // 3. 드릴 매트릭스 테이블
  if (matrixRows.length > 0) {
    text += `[3. 엄지 피치 매트릭스 가공표]\n`;
    text += `비트 │  사이즈  │ 수평 피치 │ 수직 피치\n`;
    text += `─────┼──────────┼───────────┼───────────\n`;
    matrixRows.forEach((row) => {
      const idx = `#${row.index}`.padEnd(4, ' ');
      const bit = `${row.bitSize}`.padEnd(8, ' ');
      const hp = `${row.horizPitch}`.padEnd(9, ' ');
      const vp = `${row.vertPitch}`;
      text += `${idx}│ ${bit} │ ${hp} │ ${vp}\n`;
    });
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n`;

  return text;
}
