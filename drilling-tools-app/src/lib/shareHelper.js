import { parseSpanFraction, formatFractionByDenom } from './spanConverter.js';

const toFraction64 = (num) => formatFractionByDenom(num, 64);

const formatNum = (num) => {
  if (isNaN(num)) return '-';
  if (Math.abs(num) < 0.0005) return '0.000';
  return num.toFixed(3);
};

/**
 * 🔒 제원 상태 데이터를 초경량 URL-Safe Base64 문자열로 인코딩 (보정값 0 기본화)
 */
export function encodeSharePayload(state) {
  try {
    if (!state || typeof state !== 'object') return '';
    // 필수 사용자 입력값만 추출하여 초소형 키로 매핑
    const compact = {
      m: state.midSpanStr || undefined,
      r: state.ringSpanStr || undefined,
      mh: state.midHoleCut && state.midHoleCut !== '31/32' ? state.midHoleCut : undefined,
      rh: state.ringHoleCut && state.ringHoleCut !== '31/32' ? state.ringHoleCut : undefined,
      mi: state.midInsert || undefined,
      mt: state.midTipType || undefined,
      ri: state.ringInsert || undefined,
      rt: state.ringTipType || undefined,
      b: state.bridgeStr && state.bridgeStr !== '3/16' ? state.bridgeStr : undefined,
      ft: state.fromType && state.fromType !== 'Actual Span' ? state.fromType : undefined,
      tt: state.toType && state.toType !== 'Center to Center' ? state.toType : undefined,
      mtp: state.markingType && state.markingType !== 'Cut to Cut' ? state.markingType : undefined,
      th: state.thumbHoleCut && state.thumbHoleCut !== '1 1/4' ? state.thumbHoleCut : undefined,
      hs: state.holeSize || undefined,
      os: state.ovalSize || undefined,
      oc: state.ovalCut || undefined,
      oc1: state.ovalCut1 || undefined,
      oc2: state.ovalCut2 || undefined,
      oa: state.ovalAngle && state.ovalAngle !== '0' ? state.ovalAngle : undefined,
      ld: state.latDir || undefined,
      lv: state.latVal || undefined,
      vd: state.vertDir || undefined,
      vv: state.vertVal || undefined,
      lh: state.isLeftHanded ? 1 : undefined,
      dm: state.denomMode ? state.denomMode : undefined,
      tab: state.activeTab || undefined,
    };

    // 빈 값 필터링
    const cleanObj = {};
    Object.keys(compact).forEach((k) => {
      if (compact[k] !== undefined && compact[k] !== '') {
        cleanObj[k] = compact[k];
      }
    });

    const jsonStr = JSON.stringify(cleanObj);
    // UTF-8 안전 Base64 인코딩
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
    // URL-Safe Base64 변환 (+ -> -, / -> _, = 패딩 제거)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Failed to encode share payload', e);
    return '';
  }
}

/**
 * 🔓 Base64 문자열을 원본 제원 데이터로 디코딩 (신규 초경량 및 기존 레거시 포맷 100% 호환)
 */
export function decodeSharePayload(base64Str) {
  try {
    if (!base64Str || typeof base64Str !== 'string') return null;

    // URL-Safe Base64 복원 (- -> +, _ -> /, = 패딩 복원)
    let b64 = base64Str.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }

    // Base64 디코딩 (UTF-8)
    const binary = atob(b64);
    let jsonStr;
    try {
      jsonStr = decodeURIComponent(binary.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    } catch {
      jsonStr = decodeURIComponent(binary);
    }

    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    // 1. 신규 초경량 포맷 매핑
    if ('m' in parsed || 'r' in parsed || 'hs' in parsed || 'os' in parsed || 'oa' in parsed || 'tab' in parsed) {
      return {
        midSpanStr: parsed.m || '',
        ringSpanStr: parsed.r || '',
        midHoleCut: parsed.mh || '31/32',
        ringHoleCut: parsed.rh || '31/32',
        midInsert: parsed.mi || '',
        midTipType: parsed.mt || '',
        ringInsert: parsed.ri || '',
        ringTipType: parsed.rt || '',
        bridgeStr: parsed.b || '3/16',
        fromType: parsed.ft || 'Actual Span',
        toType: parsed.tt || 'Center to Center',
        markingType: parsed.mtp || 'Cut to Cut',
        thumbHoleCut: parsed.th || '1 1/4',
        holeSize: parsed.hs || '',
        ovalSize: parsed.os || '',
        ovalCut: parsed.oc || '',
        ovalCut1: parsed.oc1 || parsed.oc || '',
        ovalCut2: parsed.oc2 || parsed.oc || '',
        ovalAngle: parsed.oa || '0',
        latDir: parsed.ld || '',
        latVal: parsed.lv || '',
        vertDir: parsed.vd || '',
        vertVal: parsed.vv || '',
        isLeftHanded: Boolean(parsed.lh),
        denomMode: parsed.dm || 32,
        activeTab: parsed.tab || undefined,
        ovalCorrection: '0',
      };
    }

    // 2. 레거시 전체 객체 포맷 호환
    parsed.ovalCorrection = '0';
    return parsed;
  } catch (e) {
    console.error('Failed to decode share payload', e);
    return null;
  }
}

/**
 * 📐 보정값 "0" 기준 엄지 오발 피치 매트릭스 계산기 (3단계 기본 3 / 정밀 5 / 초정밀 7 및 최대 8드릴 완벽 지원)
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
    precisionMode: rawPrecisionMode,
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

  const precisionMode = rawPrecisionMode || (isDetailedMode ? 'detailed' : 'basic');
  const baseBitsCount = precisionMode === 'ultra' ? 7 : (precisionMode === 'detailed' ? 5 : 3);
  const totalActiveBits = Math.min(8, baseBitsCount + (extraBitCount || 0));

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
    } else if (precisionMode === 'ultra') {
      if (rowIndex === 3) bitSize = toFraction64(baseHoleSizeNum + (ovalCutNum2 - baseHoleSizeNum) * (2 / 3));
      else if (rowIndex === 4) bitSize = toFraction64(baseHoleSizeNum + (ovalCutNum2 - baseHoleSizeNum) * (1 / 3));
      else if (rowIndex === 5) bitSize = toFraction64(baseHoleSizeNum + (ovalCutNum1 - baseHoleSizeNum) * (1 / 3));
      else if (rowIndex === 6) bitSize = toFraction64(baseHoleSizeNum + (ovalCutNum1 - baseHoleSizeNum) * (2 / 3));
      else bitSize = toFraction64(ovalCutNum1);
    } else if (precisionMode === 'detailed') {
      if (rowIndex === 3) bitSize = toFraction64((ovalCutNum2 + baseHoleSizeNum) / 2);
      else if (rowIndex === 4) bitSize = toFraction64((ovalCutNum1 + baseHoleSizeNum) / 2);
      else bitSize = toFraction64(ovalCutNum1);
    } else {
      bitSize = toFraction64(ovalCutNum1);
    }

    // 2) 수평 피치
    const customOffX = (bitCustomOffsets[rowIndex] && bitCustomOffsets[rowIndex].x) || 0;
    const calcValue1 = (((oval - ovalCutNum1) / 2) + correction) * Math.cos(radians) * handMultiplier;
    const calcValue2 = (((oval - ovalCutNum2) / 2) + correction) * Math.cos(radians) * handMultiplier;

    let baseH = 0;
    if (rowIndex === totalActiveBits) {
      baseH = thumbHorizontal;
    } else if (rowIndex === 1) {
      baseH = thumbHorizontal - calcValue1;
    } else if (rowIndex === 2) {
      baseH = thumbHorizontal + calcValue2;
    } else if (precisionMode === 'ultra') {
      if (rowIndex === 3) baseH = thumbHorizontal + calcValue2 * (2 / 3);
      else if (rowIndex === 4) baseH = thumbHorizontal + calcValue2 * (1 / 3);
      else if (rowIndex === 5) baseH = thumbHorizontal - calcValue1 * (1 / 3);
      else if (rowIndex === 6) baseH = thumbHorizontal - calcValue1 * (2 / 3);
      else baseH = thumbHorizontal;
    } else if (precisionMode === 'detailed') {
      if (rowIndex === 3) baseH = thumbHorizontal + (calcValue2 / 2);
      else if (rowIndex === 4) baseH = thumbHorizontal - (calcValue1 / 2);
      else baseH = thumbHorizontal;
    } else {
      baseH = thumbHorizontal;
    }

    const horizPitch = formatNum(baseH + customOffX);

    // 3) 수직 피치
    const customOffY = (bitCustomOffsets[rowIndex] && bitCustomOffsets[rowIndex].y) || 0;
    const vCalcValue1 = (((oval - ovalCutNum1) / 2) + correction) * Math.sin(radians);
    const vCalcValue2 = (((oval - ovalCutNum2) / 2) + correction) * Math.sin(radians);

    let baseV = 0;
    if (rowIndex === totalActiveBits) {
      baseV = thumbVertical;
    } else if (rowIndex === 1) {
      baseV = thumbVertical + vCalcValue1;
    } else if (rowIndex === 2) {
      baseV = thumbVertical - vCalcValue2;
    } else if (precisionMode === 'ultra') {
      if (rowIndex === 3) baseV = thumbVertical - vCalcValue2 * (2 / 3);
      else if (rowIndex === 4) baseV = thumbVertical - vCalcValue2 * (1 / 3);
      else if (rowIndex === 5) baseV = thumbVertical + vCalcValue1 * (1 / 3);
      else if (rowIndex === 6) baseV = thumbVertical + vCalcValue1 * (2 / 3);
      else baseV = thumbVertical;
    } else if (precisionMode === 'detailed') {
      if (rowIndex === 3) baseV = thumbVertical - (vCalcValue2 / 2);
      else if (rowIndex === 4) baseV = thumbVertical + (vCalcValue1 / 2);
      else baseV = thumbVertical;
    } else {
      baseV = thumbVertical;
    }

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
 * 🔗 제원 상태가 담긴 다이렉트 앱 실행 링크 URL 생성
 */
export function getShareUrl(state) {
  const encodedPayload = encodeSharePayload(state);
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${window.location.pathname}?share=${encodedPayload}`;
  }
  return '';
}

/**
 * 📝 카카오톡/문자/메모 전송용 포맷 제원표 텍스트 생성 (다이렉트 진입 링크 포함)
 */
export function generateShareText(title, state) {
  const {
    midSpanStr = '',
    ringSpanStr = '',
    midHoleCut = '31/32',
    ringHoleCut = '31/32',
    midInsert = '',
    midTipType = '',
    ringInsert = '',
    ringTipType = '',
    bridgeStr = '3/16',
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
  const shareUrl = getShareUrl(state);

  let text = `🎳 [ProDrill Tools 지공 제원표]\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `■ 슬롯명: ${title || '현재 제원'}\n`;
  text += `■ 손구분: ${handStr}\n`;
  if (shareUrl) {
    text += `🔗 [앱에서 바로 열기]:\n${shareUrl}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  // 1. 스판 & 미드라인 제원 (인서트 및 팁 종류 포함)
  const midDetails = [
    `홀: ${midHoleCut || '-'}`,
    midInsert ? `인서트: ${midInsert}` : null,
    midTipType ? `팁: ${midTipType}` : null,
  ].filter(Boolean).join(', ');

  const ringDetails = [
    `홀: ${ringHoleCut || '-'}`,
    ringInsert ? `인서트: ${ringInsert}` : null,
    ringTipType ? `팁: ${ringTipType}` : null,
  ].filter(Boolean).join(', ');

  text += `[1. 스판 & 미드라인]\n`;
  text += `• 중지: ${midSpanStr || '-'} (${midDetails})\n`;
  text += `• 약지: ${ringSpanStr || '-'} (${ringDetails})\n`;
  text += `• 브릿지: ${bridgeStr}\n`;
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

  if (shareUrl) {
    text += `\n🔗 [ProDrill 앱 바로 열기]\n${shareUrl}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
  }

  return text;
}
