import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSignature } from '../src/lib/encryption.js';

// 엑셀 파서 라이브러리 동적 가져오기 (xlsx / exceljs)
let XLSX;
try {
  XLSX = (await import('xlsx')).default;
} catch {
  console.log('📦 xlsx 라이브러리 자동 로딩 시도 중...');
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    XLSX = require('xlsx');
  } catch {
    console.error('❌ xlsx 라이브러리를 찾을 수 없습니다. npm install xlsx 실행 후 다시 시도해 주세요.');
    process.exit(1);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCellValue(sheet, cellAddr) {
  if (!sheet || !cellAddr || !sheet[cellAddr]) return '';
  const cell = sheet[cellAddr];
  if (cell.v === undefined || cell.v === null) return '';
  return String(cell.v).trim();
}

function formatExcelDate(rawDate) {
  if (!rawDate) return new Date().toISOString().substring(0, 10);
  const str = String(rawDate).trim();
  if (!str) return new Date().toISOString().substring(0, 10);

  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 10000 && num < 100000) {
      const date = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().substring(0, 10);
      }
    }
  }

  if (str.length === 8 && /^\d+$/.test(str)) {
    return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
  }

  return str;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

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

function toReducedFraction(rawVal, baseDenominator = 32) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  const strVal = String(rawVal).trim();
  if (!strVal) return '';
  if (strVal === '0' || strVal === '0.0' || strVal === '-0') return '0';

  const num = parseFractionOrFloat(strVal);
  if (num === null) return strVal;
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

function calculatePitchWithDirection(rawVal, hand, defaultDirRight, defaultDirLeft, baseDenominator = 32, isRing = false) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return { val: '', dir: '' };
  const strVal = String(rawVal).trim();
  if (!strVal) return { val: '', dir: '' };

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

function parseInputSheet(formSheet, diagramSheet, isSub = false, ownerEmail = '', fallbackName = '') {
  if (!formSheet) return null;
  const rawName = getCellValue(formSheet, 'B3');
  const baseName = rawName || fallbackName;
  if (!baseName) return null;

  const finalCustomerName = isSub ? `${baseName}_서브` : baseName;
  const hand = getCellValue(formSheet, 'B5') || '오른손';

  if (isSub) {
    const b9 = getCellValue(formSheet, 'B9');
    const b10 = getCellValue(formSheet, 'B10');
    const b11 = getCellValue(formSheet, 'B11');
    const b12 = getCellValue(formSheet, 'B12');
    const b13 = getCellValue(formSheet, 'B13');

    const hasSubData = [b9, b10, b11, b12, b13].some(v => v !== '');
    if (!hasSubData) {
      console.log(`ℹ️ [서브 차트 스킵] B9~B13 수치가 전무하여 '${finalCustomerName}' 차트는 생성하지 않습니다.`);
      return null;
    }
  }

  const rawDate = getCellValue(formSheet, 'B2');
  const dateStr = formatExcelDate(rawDate);

  const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chartId = `chart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const visualMemos = [];

  const e8Raw = getCellValue(formSheet, 'E8');
  const e9Raw = getCellValue(formSheet, 'E9');
  const e10Raw = getCellValue(formSheet, 'E10');
  if (e8Raw) {
    const e8Val = toReducedFraction(e8Raw, 32);
    const e9Val = e9Raw ? `좌 ${toReducedFraction(e9Raw, 32)}` : null;
    const e10Val = e10Raw ? `우 ${toReducedFraction(e10Raw, 32)}` : null;

    const offsetLines = [e8Val, e9Val, e10Val].filter(Boolean).join('\n');
    visualMemos.push({
      id: `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  const d17 = getCellValue(formSheet, 'D17');
  if (d17 && d17.trim() !== '메모') {
    visualMemos.push({
      id: `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
          id: `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

  const midLatParsed = calculatePitchWithDirection(getCellValue(formSheet, 'B12'), hand, 'Left', 'Right', 32, false);
  const ringLatParsed = calculatePitchWithDirection(getCellValue(formSheet, 'B18'), hand, 'Right', 'Left', 32, true);

  const e4Str = getCellValue(formSheet, 'E4');
  const e5Str = getCellValue(formSheet, 'E5');
  let thumbLeftRaw = toReducedFraction(e4Str, 64);
  let thumbRightRaw = toReducedFraction(e5Str, 64);
  if (e4Str === '0' || e5Str === '0') {
    thumbLeftRaw = '0';
    thumbRightRaw = '';
  }

  const e12Val = toReducedFraction(getCellValue(formSheet, 'E12'), 64);
  const e13Val = toReducedFraction(getCellValue(formSheet, 'E13'), 64);
  const bevel1Str = e12Val ? `${e12Val}|` : '';
  const bevel2Str = e13Val ? `${e13Val}|` : '';

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
        bridge: '',
        spanLeft: toReducedFraction(getCellValue(formSheet, 'B21'), 32),
        spanRight: toReducedFraction(getCellValue(formSheet, 'B22'), 32),
        midPitch: {
          tipType: getCellValue(formSheet, 'B7') || '',
          holeCutSize: toReducedFraction(getCellValue(formSheet, 'B9'), 32),
          reverse: midRevFwd.rev,
          forward: midRevFwd.fwd,
          up: midRevFwd.rev,
          down: midRevFwd.fwd,
          lat: midLatParsed.val,
          latDir: midLatParsed.dir,
          insertSize: toReducedFraction(getCellValue(formSheet, 'B13'), 32)
        },
        ringPitch: {
          tipType: '',
          holeCutSize: toReducedFraction(getCellValue(formSheet, 'B15'), 32),
          reverse: ringRevFwd.rev,
          forward: ringRevFwd.fwd,
          up: ringRevFwd.rev,
          down: ringRevFwd.fwd,
          lat: ringLatParsed.val,
          latDir: ringLatParsed.dir,
          insertSize: toReducedFraction(getCellValue(formSheet, 'B19'), 32)
        },
        thumbPitch: {
          reverse: thumbRevFwd.rev,
          forward: thumbRevFwd.fwd,
          down: thumbRevFwd.rev,
          up: thumbRevFwd.fwd,
          left: thumbLeftRaw || '',
          right: thumbRightRaw || ''
        },
        thumbOffset: { left: '', right: '' },
        thumbDetails: {
          slugType: toReducedFraction(getCellValue(formSheet, 'E1'), 64),
          holeCutSize: toReducedFraction(getCellValue(formSheet, 'E1'), 64),
          holeSize: toReducedFraction(getCellValue(formSheet, 'E6'), 64),
          bevel1: bevel1Str,
          bevel2: bevel2Str,
          ovalSize: toReducedFraction(getCellValue(formSheet, 'E15'), 64),
          ovalCut: toReducedFraction(getCellValue(formSheet, 'E16'), 64)
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

  return { customer, chartRecord };
}

export async function migrateExcelToProDrill(excelFilePath, ownerEmail = 'sysmedic3@gmail.com') {
  if (!fs.existsSync(excelFilePath)) {
    throw new Error(`파일을 찾을 수 없습니다: ${excelFilePath}`);
  }

  console.log(`📊 [엑셀 차트 마이그레이터] 신규 정책 적용 파싱 가동 중: ${excelFilePath}`);
  console.log(`🔑 [계정 강제 주입]: ${ownerEmail}`);

  const workbook = XLSX.readFile(excelFilePath);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length < 3) {
    throw new Error('엑셀 파일 시트가 최소 3개 이상(도면, 입력창)이어야 합니다.');
  }

  const sheet1_mainDiagram = workbook.Sheets[sheetNames[0]];
  const sheet2_subDiagram = sheetNames[1] ? workbook.Sheets[sheetNames[1]] : null;
  const sheet3_mainInput = workbook.Sheets[sheetNames[2]] || workbook.Sheets[sheetNames[0]];
  const sheet4_subInput = sheetNames[3] ? workbook.Sheets[sheetNames[3]] : null;

  const customers = [];
  const chartHistories = {};

  let mainName = '';
  const mainParsed = parseInputSheet(sheet3_mainInput, sheet1_mainDiagram, false, ownerEmail);
  if (mainParsed) {
    mainName = mainParsed.customer.name;
    mainParsed.customer.createdByEmail = ownerEmail;
    mainParsed.chartRecord.createdByEmail = ownerEmail;

    customers.push(mainParsed.customer);
    chartHistories[mainParsed.customer.id] = [mainParsed.chartRecord];
    console.log(`✅ [메인 고객 차트 맵핑 완료]: '${mainParsed.customer.name}'`);
  }

  if (sheet4_subInput) {
    const subParsed = parseInputSheet(sheet4_subInput, sheet2_subDiagram, true, ownerEmail, mainName);
    if (subParsed) {
      subParsed.customer.createdByEmail = ownerEmail;
      subParsed.chartRecord.createdByEmail = ownerEmail;

      customers.push(subParsed.customer);
      chartHistories[subParsed.customer.id] = [subParsed.chartRecord];
      console.log(`✅ [서브 고객 차트 맵핑 완료]: '${subParsed.customer.name}'`);
    }
  }

  const dataPayload = {
    customers,
    chartHistories,
    customBowlingBalls: []
  };

  const signature = generateSignature(dataPayload, ownerEmail);

  const backupPackage = {
    appId: 'ProDrill',
    exportedAt: new Date().toISOString(),
    ownerEmail: ownerEmail,
    signature: signature,
    version: 1,
    data: dataPayload
  };

  const outputFileName = `prodrill_local_backup_${ownerEmail.split('@')[0]}_${new Date().toISOString().substring(0, 10)}.json`;
  const outputPath = path.join(path.dirname(excelFilePath), outputFileName);

  fs.writeFileSync(outputPath, JSON.stringify(backupPackage, null, 2), 'utf-8');

  console.log(`🎉 [신규 정책 마이그레이션 백업 생성 성공]`);
  console.log(`📁 생성된 파일: ${outputPath}`);
  console.log(`👤 변환된 총 고객 수: ${customers.length}명`);

  return { outputPath, backupPackage };
}

if (process.argv[1] && process.argv[1].endsWith('excel_chart_migrator.js')) {
  const fileArg = process.argv[2];
  const emailArg = process.argv[3] || 'sysmedic3@gmail.com';

  if (!fileArg) {
    console.log('사용법: node scripts/excel_chart_migrator.js <excelFilePath> [ownerEmail]');
    process.exit(1);
  }

  migrateExcelToProDrill(fileArg, emailArg)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ 마이그레이션 실패:', err.message);
      process.exit(1);
    });
}
