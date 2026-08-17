import { generateSignature } from './encryption.js';
import { createLocalId } from './ids.js';

/**
 * 셀 값 텍스트 안전 추출 헬퍼
 */
function getCellValue(sheet, cellAddr) {
  if (!sheet || !cellAddr || !sheet[cellAddr]) return '';
  const cell = sheet[cellAddr];
  if (cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

/**
 * 엑셀 날짜 일련번호(예: 45565) 또는 날짜 텍스트를 YYYY-MM-DD 포맷으로 변환하는 헬퍼
 */
function formatExcelDate(rawDate) {
  if (!rawDate) return new Date().toISOString().substring(0, 10);
  const str = String(rawDate).trim();
  if (!str) return new Date().toISOString().substring(0, 10);

  // 엑셀 일련번호 (숫자만 있는 경우, 예: 45565)
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 10000 && num < 100000) {
      const date = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().substring(0, 10);
      }
    }
  }

  // 8자리 텍스트 (예: 20260816)
  if (str.length === 8 && /^\d+$/.test(str)) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
  }

  return str;
}

/**
 * 최대공약수(GCD) 연산 함수
 */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * 텍스트/분수/실수를 숫자 float 값으로 파싱
 */
function parseFractionOrFloat(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return null;
  const str = String(rawVal).trim();
  if (!str) return null;

  if (str.includes('/')) {
    const parts = str.split(' ');
    if (parts.length === 2 && parts[1].includes('/')) {
      const whole = parseFloat(parts[0]);
      const [n, d] = parts[1].split('/').map(Number);
      if (!isNaN(whole) && !isNaN(n) && !isNaN(d) && d !== 0) {
        return whole + (n / d);
      }
    } else if (parts.length === 1) {
      const [n, d] = parts[0].split('/').map(Number);
      if (!isNaN(n) && !isNaN(d) && d !== 0) {
        return n / d;
      }
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

/**
 * 수치를 지정된 분모 기준(32분법 / 64분법) 기약분수(Reduced Fraction) 텍스트로 변환
 */
function toReducedFraction(rawVal, baseDenominator = 32) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  const strVal = String(rawVal).trim();
  if (!strVal) return '';
  if (strVal === '0' || strVal === '0.0' || strVal === '-0') return '0';

  const num = parseFractionOrFloat(strVal);
  if (num === null) return strVal; // 텍스트 형태(semi, oval 등)는 원본 반환
  if (num === 0) return '0';

  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);
  const whole = Math.floor(absNum);
  const remainder = absNum - whole;

  if (remainder < 0.0001) {
    return whole === 0 ? '0' : `${sign}${whole}`;
  }

  const rawNumerator = Math.round(remainder * baseDenominator);
  if (rawNumerator === 0) {
    return whole === 0 ? '0' : `${sign}${whole}`;
  }
  if (rawNumerator === baseDenominator) {
    return `${sign}${whole + 1}`;
  }

  const common = gcd(rawNumerator, baseDenominator);
  const numReduced = rawNumerator / common;
  const denReduced = baseDenominator / common;

  if (whole > 0) {
    return `${sign}${whole} ${numReduced}/${denReduced}`;
  }
  return `${sign}${numReduced}/${denReduced}`;
}

/**
 * 피치 수치 및 레터럴 방향 정밀 계산 헬퍼 (기약분수 변환 적용 & 0값 디폴트 위치 연산)
 */
function calculatePitchWithDirection(rawVal, hand, defaultDirRight, defaultDirLeft, baseDenominator = 32, isRing = false) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return { val: '', dir: '' };
  const strVal = String(rawVal).trim();
  if (!strVal) return { val: '', dir: '' };

  // 🌟 0값 처리 규칙: 중지/엄지 ➔ Left에 '0', 약지 ➔ Right에 '0'
  if (strVal === '0' || strVal === '0.0' || strVal === '-0') {
    const dir = isRing ? 'Right' : 'Left';
    return { val: '0', dir };
  }

  let numVal = strVal;
  let rawDir = '';

  if (strVal.includes('Left') || strVal.includes('Right') || strVal.includes('L') || strVal.includes('R')) {
    const match = strVal.match(/(Left|Right|L|R)?\s*([-\d./]+)\s*(Left|Right|L|R)?/i);
    if (match) {
      const d = (match[1] || match[3] || '').toUpperCase();
      rawDir = d.startsWith('L') ? 'Left' : (d.startsWith('R') ? 'Right' : '');
      numVal = match[2] || '';
    }
  }

  const num = parseFractionOrFloat(numVal);
  if (num === null) return { val: strVal, dir: rawDir };

  if (num === 0) {
    const dir = isRing ? 'Right' : 'Left';
    return { val: '0', dir };
  }

  const isRightHand = !hand.includes('왼') && (hand.includes('오른') || hand.includes('Right') || hand.includes('우'));
  const isNegative = num < 0;

  let dir = rawDir || (isRightHand ? defaultDirRight : defaultDirLeft);
  if (isNegative && !rawDir) {
    dir = dir === 'Left' ? 'Right' : 'Left';
  }

  const reducedVal = toReducedFraction(Math.abs(num), baseDenominator);
  return { val: reducedVal, dir };
}

/**
 * Reverse/Forward 수치 파싱 (0값 입력 시 무조건 Reverse에 '0' 기록!)
 */
function parseRevFwdPitches(formSheet, revCell, fwdCell, baseDenominator = 32) {
  const revStr = getCellValue(formSheet, revCell);
  const fwdStr = getCellValue(formSheet, fwdCell);

  const revNum = parseFractionOrFloat(revStr);
  const fwdNum = parseFractionOrFloat(fwdStr);

  if (revStr === '0' || revNum === 0 || fwdStr === '0' || fwdNum === 0) {
    return { rev: '0', fwd: '' };
  }

  if (revStr && revNum !== 0) {
    return { rev: toReducedFraction(revStr, baseDenominator), fwd: '' };
  }
  if (fwdStr && fwdNum !== 0) {
    return { rev: '', fwd: toReducedFraction(fwdStr, baseDenominator) };
  }

  return { rev: '', fwd: '' };
}

/**
 * 엑셀 시트 1개 폼 파싱 함수 (시트3 메인입력창 / 시트4 서브입력창)
 */
function parseInputSheet(formSheet, diagramSheet, isSub = false, ownerEmail = '', fallbackName = '', fileName = '') {
  if (!formSheet) return null;
  const rawName = getCellValue(formSheet, 'B3');
  const baseName = rawName || fallbackName;

  // 🌟 [지공사 절대 규칙]: 시트 이름과 이중 조합하지 않고, 엑셀 파일명(확장자 제외)을 1:1 고객 이름으로 직접 치환!
  const cleanFileName = fileName ? fileName.replace(/\.xlsx$/i, '').replace(/\.xls$/i, '').trim() : '';

  let finalCustomerName = cleanFileName || baseName;
  if (!finalCustomerName) return null;

  if (isSub) {
    finalCustomerName = `${finalCustomerName}_서브`;
  }
  const hand = getCellValue(formSheet, 'B5') || '오른손';

  // 서브 차트인 경우 B9, B10, B11, B12, B13 자료 존재 유무 체크 (하나라도 유효하면 생성)
  if (isSub) {
    const b9 = getCellValue(formSheet, 'B9');
    const b10 = getCellValue(formSheet, 'B10');
    const b11 = getCellValue(formSheet, 'B11');
    const b12 = getCellValue(formSheet, 'B12');
    const b13 = getCellValue(formSheet, 'B13');

    const hasSubData = [b9, b10, b11, b12, b13].some(v => v !== '');
    if (!hasSubData) {
      return null;
    }
  }

  const rawDate = getCellValue(formSheet, 'B2');
  const dateStr = formatExcelDate(rawDate);

  const customerId = createLocalId('cust');
  const chartId = createLocalId('chart');

  // 🌟 [도면 핀 메모(Visual Memos) 좌표/색상/핀 자동 생성 로직]:
  const visualMemos = [];

  // 1. E8 퍼플 메모 (Purple, x: 1.935, y: 45.275, w: 161, h: 106, 32분법 기약분수 + E9 "좌 ", E10 "우 ")
  const e8Raw = getCellValue(formSheet, 'E8');
  const e9Raw = getCellValue(formSheet, 'E9');
  const e10Raw = getCellValue(formSheet, 'E10');
  if (e8Raw) {
    const e8Val = toReducedFraction(e8Raw, 32);
    const e9Val = e9Raw ? `좌 ${toReducedFraction(e9Raw, 32)}` : null;
    const e10Val = e10Raw ? `우 ${toReducedFraction(e10Raw, 32)}` : null;

    const offsetLines = [e8Val, e9Val, e10Val].filter(Boolean).join('\n');
    visualMemos.push({
      id: createLocalId('memo'),
      x: 1.935047284783714,
      y: 45.27500644431793,
      text: offsetLines,
      section: 'chart',
      color: 'purple',
      shape: 'memo',
      isPinned: true,
      width: 161,
      height: 106,
      createdAt: new Date().toISOString()
    });
  }

  // 2. D17 그린 메모 (Green, x: 68.058, y: 36.665, w: 164, h: 87 - "메모" 기본 템플릿 텍스트 스킵)
  const d17 = getCellValue(formSheet, 'D17');
  if (d17 && d17.trim() !== '메모') {
    visualMemos.push({
      id: createLocalId('memo'),
      x: 68.0588558519244,
      y: 36.6659028436807,
      text: d17,
      section: 'chart',
      color: 'green',
      shape: 'memo',
      isPinned: true,
      width: 164,
      height: 87,
      createdAt: new Date().toISOString()
    });
  }

  // 3. 시트1 / 시트2 도면 메모 (Blue, H36~H40, x: 68.599, y: 52.917, w: 165, h: 87 - 0값 제외)
  if (diagramSheet) {
    const h36 = getCellValue(diagramSheet, 'H36');
    if (h36 && h36 !== '0') {
      const h37 = getCellValue(diagramSheet, 'H37');
      const h38 = getCellValue(diagramSheet, 'H38');
      const h39 = getCellValue(diagramSheet, 'H39');
      const h40 = getCellValue(diagramSheet, 'H40');

      const diagramLines = [h36, h37 && h37 !== '0' ? h37 : null, h38 && h38 !== '0' ? h38 : null, h39 && h39 !== '0' ? h39 : null, h40 && h40 !== '0' ? h40 : null].filter(Boolean).join('\n');
      if (diagramLines) {
        visualMemos.push({
          id: createLocalId('memo'),
          x: 68.59909182348434,
          y: 52.91726590287174,
          text: diagramLines,
          section: 'chart',
          color: 'blue',
          shape: 'memo',
          isPinned: true,
          width: 165,
          height: 87,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  const isRight = hand.includes('오른') || hand.includes('Right') || !hand.includes('왼');

  // 중지 레터럴 (B12): 32분법 / 오른손 기본 Left / 0값 ➔ Left '0'
  const midLatParsed = calculatePitchWithDirection(getCellValue(formSheet, 'B12'), hand, 'Left', 'Right', 32, false);
  // 약지 레터럴 (B18): 32분법 / 오른손 기본 Right / 0값 ➔ Right '0'
  const ringLatParsed = calculatePitchWithDirection(getCellValue(formSheet, 'B18'), hand, 'Right', 'Left', 32, true);

  // 엄지 레터럴 (E4/E5): 64분법 / 0값 ➔ Left '0'
  const e4Str = getCellValue(formSheet, 'E4');
  const e5Str = getCellValue(formSheet, 'E5');
  let thumbLeftRaw = toReducedFraction(e4Str, 64);
  let thumbRightRaw = toReducedFraction(e5Str, 64);
  if (e4Str === '0' || e5Str === '0') {
    thumbLeftRaw = '0';
    thumbRightRaw = '';
  }

  // 엄지 베벨 1 (E12) / 베벨 2 (E13) 64분법 기약분수 파이프(|) 접미 연산
  const e12Val = toReducedFraction(getCellValue(formSheet, 'E12'), 64);
  const e13Val = toReducedFraction(getCellValue(formSheet, 'E13'), 64);
  const bevel1Str = e12Val ? `${e12Val}|` : '';
  const bevel2Str = e13Val ? `${e13Val}|` : '';

/**
 * 성별 정제 헬퍼 (남/여 또는 공난)
 */
function parseGender(rawGender) {
  if (!rawGender) return '';
  const str = String(rawGender).trim().toUpperCase();
  if (['남', '남자', '남성', 'M', 'MALE'].includes(str)) return '남';
  if (['여', '여자', '여성', 'F', 'FEMALE'].includes(str)) return '여';
  return '';
}

  const customer = {
    id: customerId,
    name: finalCustomerName,
    phone: getCellValue(formSheet, 'B4'),
    hand: hand,
    gender: parseGender(getCellValue(formSheet, 'B8')),
    style: getCellValue(formSheet, 'B6') || '',
    createdAt: dateStr,
    updatedAt: new Date().toISOString(),
    createdByEmail: ownerEmail
  };

  // Reverse / Forward 0값 무조건 Reverse 기록 규칙 연산
  const midRevFwd = parseRevFwdPitches(formSheet, 'B10', 'B11', 32);
  const ringRevFwd = parseRevFwdPitches(formSheet, 'B16', 'B17', 32);
  const thumbRevFwd = parseRevFwdPitches(formSheet, 'E2', 'E3', 64);

  const chartRecord = {
    id: chartId,
    customerId: customerId,
    name: `${finalCustomerName} 마이그레이션 차트`,
    date: dateStr,
    createdAt: dateStr,
    updatedAt: new Date().toISOString(),
    timestamp: dateStr,
    createdByEmail: ownerEmail,
    // 🌟 [ProDrill 8.0 표준 래퍼 1:1 완벽 정밀 셀 매핑]:
    data: {
      ballName: `${finalCustomerName} 마이그레이션 차트`,
      layoutInfo: '',
      intent: '엑셀 지공차트 마이그레이션 자동 변환 기록',
      memos: visualMemos,
      customerInfo: {
        fingerStiff: '', thumbStiff: '', moisture: '', trackFlare: '',
        tilt: '', papX: '', papY: '', ballSpeed: '', rpm: ''
      },
      chartData: {
        isThumbless: false,
        handedness: isRight ? 'right' : 'left',
        bridge: '',                                          // 🌟 Bridge 수치 공난 처리
        spanLeft: toReducedFraction(getCellValue(formSheet, 'B21'), 32),   // 중지 Span 32분법 (B21)
        spanRight: toReducedFraction(getCellValue(formSheet, 'B22'), 32),  // 약지 Span 32분법 (B22)
        midPitch: {
          tipType: getCellValue(formSheet, 'B7') || '',       // 중지 팁종류 (B7)
          holeCutSize: toReducedFraction(getCellValue(formSheet, 'B9'), 32),   // 중지 홀컷 32분법 (B9)
          reverse: midRevFwd.rev,                             // 중지 리버스 32분법 (0값은 Reverse 기록)
          forward: midRevFwd.fwd,                             // 중지 포워드 32분법
          up: midRevFwd.rev,                                  // 🌟 입력창 전용 Reverse (▲)
          down: midRevFwd.fwd,                                // 🌟 입력창 전용 Forward (▼)
          lat: midLatParsed.val,                              // 중지 레터럴 32분법 (B12)
          latDir: midLatParsed.dir,                           // 중지 레터럴 방향 (0값은 Left)
          insertSize: toReducedFraction(getCellValue(formSheet, 'B13'), 32)    // 중지 인서트 32분법 (B13)
        },
        ringPitch: {
          tipType: '',                                        // 약지 팁종류 없음
          holeCutSize: toReducedFraction(getCellValue(formSheet, 'B15'), 32),  // 약지 홀컷 32분법 (B15)
          reverse: ringRevFwd.rev,                            // 약지 리버스 32분법 (0값은 Reverse 기록)
          forward: ringRevFwd.fwd,                            // 약지 포워드 32분법
          up: ringRevFwd.rev,                                 // 🌟 입력창 전용 Reverse (▲)
          down: ringRevFwd.fwd,                               // 🌟 입력창 전용 Forward (▼)
          lat: ringLatParsed.val,                             // 약지 레터럴 32분법 (B18)
          latDir: ringLatParsed.dir,                          // 약지 레터럴 방향 (0값은 Right)
          insertSize: toReducedFraction(getCellValue(formSheet, 'B19'), 32)    // 약지 인서트 32분법 (B19)
        },
        thumbPitch: {
          reverse: thumbRevFwd.rev,                           // 엄지 리버스 64분법 (E2, 0값은 Reverse 기록)
          forward: thumbRevFwd.fwd,                           // 엄지 포워드 64분법 (E3)
          down: thumbRevFwd.rev,                              // 🌟 입력창 전용 Reverse (▼)
          up: thumbRevFwd.fwd,                                // 🌟 입력창 전용 Forward (▲)
          left: thumbLeftRaw || '',                            // 엄지 레터럴 Left 64분법 (E4, 0값은 Left 기록)
          right: thumbRightRaw || ''                           // 엄지 레터럴 Right 64분법 (E5)
        },
        thumbOffset: { left: '', right: '' },
        thumbDetails: {
          slugType: toReducedFraction(getCellValue(formSheet, 'E1'), 64),      // 엄지 덤타입/홀컷 64분법 (E1)
          holeCutSize: toReducedFraction(getCellValue(formSheet, 'E1'), 64),
          holeSize: toReducedFraction(getCellValue(formSheet, 'E6'), 64),      // 엄지 원홀 64분법 (E6)
          bevel1: bevel1Str,                                  // 🌟 베벨 1 (E12 + "|")
          bevel2: bevel2Str,                                  // 🌟 베벨 2 (E13 + "|")
          ovalSize: toReducedFraction(getCellValue(formSheet, 'E15'), 64),     // 오발 사이즈 64분법 (E15)
          ovalCut: toReducedFraction(getCellValue(formSheet, 'E16'), 64)       // 오발 컷 64분법 (E16)
        },
        drillingGuide: {
          ovalCut: toReducedFraction(getCellValue(formSheet, 'E16'), 64),
          bevel1Front: e12Val,
          bevel2Front: e13Val,
          ovalCorrection: '0',
          isDetailedMode: false
        },
        notes: ''
      }
    }
  };

  return {
    customer,
    chartRecord
  };
}

/**
 * 엑셀 ArrayBuffer를 받아서 ProDrill 정식 백업 JSON 파일로 생성 및 브라우저 다운로드 실행
 * @param {ArrayBuffer} arrayBuffer - 선택한 엑셀 파일 버퍼
 * @param {string} ownerEmail - 마이그레이션할 구글 계정 이메일
 * @returns {Promise<{ filename: string, count: number, names: string[] }>}
 */
export async function convertExcelToBackupJsonInBrowser(arrayBuffer, ownerEmail = 'sysmedic3@gmail.com') {
  let XLSX;
  try {
    XLSX = (await import('xlsx')).default || (await import('xlsx'));
  } catch {
    throw new Error('XLSX_LOAD_FAILED: 엑셀 파싱 모듈을 불러오지 못했습니다.');
  }

  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetNames = workbook.SheetNames;

  if (!sheetNames || sheetNames.length < 3) {
    throw new Error('INVALID_EXCEL_FORMAT: 엑셀 파일에 최소 3개 이상의 시트가 포함되어 있어야 합니다.');
  }

  const sheet1_mainDiagram = workbook.Sheets[sheetNames[0]];
  const sheet2_subDiagram = sheetNames[1] ? workbook.Sheets[sheetNames[1]] : null;
  const sheet3_mainInput = workbook.Sheets[sheetNames[2]] || workbook.Sheets[sheetNames[0]];
  const sheet4_subInput = sheetNames[3] ? workbook.Sheets[sheetNames[3]] : null;

  const customers = [];
  const chartHistories = {};

  const cleanOwnerEmail = (ownerEmail || 'sysmedic3@gmail.com').trim().toLowerCase();

  let mainName = '';
  const mainParsed = parseInputSheet(sheet3_mainInput, sheet1_mainDiagram, false, cleanOwnerEmail);
  if (mainParsed) {
    mainName = mainParsed.customer.name;
    mainParsed.customer.createdByEmail = cleanOwnerEmail;
    mainParsed.chartRecord.createdByEmail = cleanOwnerEmail;

    customers.push(mainParsed.customer);
    chartHistories[mainParsed.customer.id] = [mainParsed.chartRecord];
  }

  if (sheet4_subInput) {
    const subParsed = parseInputSheet(sheet4_subInput, sheet2_subDiagram, true, cleanOwnerEmail, mainName);
    if (subParsed) {
      subParsed.customer.createdByEmail = cleanOwnerEmail;
      subParsed.chartRecord.createdByEmail = cleanOwnerEmail;

      customers.push(subParsed.customer);
      chartHistories[subParsed.customer.id] = [subParsed.chartRecord];
    }
  }

  if (customers.length === 0) {
    throw new Error('NO_CUSTOMER_FOUND: 엑셀 파일에서 유효한 고객 명단을 추출하지 못했습니다.');
  }

  const dataPayload = {
    customers,
    chartHistories,
    customBowlingBalls: []
  };

  const signature = generateSignature(dataPayload, cleanOwnerEmail);

  const backupPackage = {
    appId: 'ProDrill',
    exportedAt: new Date().toISOString(),
    ownerEmail: cleanOwnerEmail,
    signature: signature,
    version: 1,
    data: dataPayload
  };

  const filename = `prodrill_local_backup_${cleanOwnerEmail.split('@')[0]}_${new Date().toISOString().substring(0, 10)}.json`;

  // 브라우저 파일 자동 다운로드 파일 출력
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const jsonStr = JSON.stringify(backupPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    filename,
    count: customers.length,
    names: customers.map(c => c.name)
  };
}

/**
 * 다중 엑셀 파일들을 받아서 템프 파일(~$), 오류 파일 자동 스킵 후 1개의 통합 백업 JSON 생성 및 브라우저 다운로드
 * @param {FileList|File[]} files - 선택한 엑셀 파일 배열 (또는 webkitdirectory 폴더 업로드 파일들)
 * @param {string} ownerEmail - 계정 이메일
 */
export async function convertMultipleExcelsToBackupJsonInBrowser(files, ownerEmail = 'sysmedic3@gmail.com') {
  let XLSX;
  try {
    XLSX = (await import('xlsx')).default || (await import('xlsx'));
  } catch {
    throw new Error('XLSX_LOAD_FAILED: 엑셀 파싱 모듈을 불러오지 못했습니다.');
  }

  const cleanOwnerEmail = (ownerEmail || 'sysmedic3@gmail.com').trim().toLowerCase();
  const fileArray = Array.from(files || []);

  // 🌟 1. 템프 파일(~$로 시작), 맥/윈도우 숨김 파일(.DS_Store, Thumbs.db), 0바이트 파일 사전 차단 필터링!
  const validFiles = fileArray.filter(f => {
    if (!f || !f.name) return false;
    const name = f.name;
    if (name.startsWith('~$') || name.startsWith('.') || f.size === 0) return false;
    return name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls');
  });

  if (validFiles.length === 0) {
    throw new Error('NO_VALID_EXCEL_FILES: 선택한 파일 중 유효한 엑셀 파일(.xlsx, .xls)을 찾지 못했습니다.');
  }

  const allCustomers = [];
  const allChartHistories = {};
  let successCount = 0;
  let skippedCount = 0;

  for (const file of validFiles) {
    // 🌟 2. 개별 파일 try-catch 예외 보호 - 1개 손상되더라도 절대 전체 파싱 중단 없이 안전 스킵!
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      if (!sheetNames || sheetNames.length < 3) {
        skippedCount++;
        continue;
      }

      const sheet1 = workbook.Sheets[sheetNames[0]];
      const sheet2 = sheetNames[1] ? workbook.Sheets[sheetNames[1]] : null;
      const sheet3 = workbook.Sheets[sheetNames[2]] || workbook.Sheets[sheetNames[0]];
      const sheet4 = sheetNames[3] ? workbook.Sheets[sheetNames[3]] : null;

      let mainName = '';
      const mainParsed = parseInputSheet(sheet3, sheet1, false, cleanOwnerEmail, '', file.name);
      if (mainParsed) {
        mainName = mainParsed.customer.name;
        allCustomers.push(mainParsed.customer);
        allChartHistories[mainParsed.customer.id] = [mainParsed.chartRecord];
        successCount++;
      }

      if (sheet4) {
        const subParsed = parseInputSheet(sheet4, sheet2, true, cleanOwnerEmail, mainName, file.name);
        if (subParsed) {
          allCustomers.push(subParsed.customer);
          allChartHistories[subParsed.customer.id] = [subParsed.chartRecord];
        }
      }
    } catch (err) {
      console.warn(`[일괄 파싱 안전 스킵] 손상/오류 엑셀 파일 '${file.name}' 건너뜀:`, err);
      skippedCount++;
    }
  }

  if (allCustomers.length === 0) {
    throw new Error('NO_CUSTOMER_FOUND: 유효한 지공 차트 고객 명단을 추출하지 못했습니다.');
  }

  const dataPayload = {
    customers: allCustomers,
    chartHistories: allChartHistories,
    customBowlingBalls: []
  };

  const signature = generateSignature(dataPayload, cleanOwnerEmail);

  const backupPackage = {
    appId: 'ProDrill',
    exportedAt: new Date().toISOString(),
    ownerEmail: cleanOwnerEmail,
    signature: signature,
    version: 1,
    data: dataPayload
  };

  const filename = `prodrill_batch_backup_${cleanOwnerEmail.split('@')[0]}_${new Date().toISOString().substring(0, 10)}.json`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const jsonStr = JSON.stringify(backupPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    filename,
    totalFiles: validFiles.length,
    successCount,
    skippedCount,
    customerCount: allCustomers.length
  };
}
