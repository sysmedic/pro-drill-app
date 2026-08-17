import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let XLSX;
try {
  XLSX = (await import('xlsx')).default;
} catch {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  XLSX = require('xlsx');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSampleExcel() {
  const wb = XLSX.utils.book_new();

  // 시트1: 메인 차트 도면
  const sheet1Data = Array.from({ length: 45 }, () => Array(10).fill(''));
  sheet1Data[35][7] = '0'; // H36 (0이면 스킵)
  sheet1Data[36][7] = '기본 오발 도면 조율'; // H37 (퍼플 메모 2행)
  sheet1Data[37][7] = '0'; // H38 (스킵)
  sheet1Data[38][7] = '백엔드 마찰 강화'; // H39 (퍼플 메모 4행)
  const sheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // 시트2: 서브 차트 도면
  const sheet2Data = Array.from({ length: 45 }, () => Array(10).fill(''));
  sheet2Data[35][7] = '서브 도면 가이드'; // H36
  const sheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  // 시트3: 메인 입력창
  const sheet3Data = Array.from({ length: 30 }, () => Array(6).fill(''));
  sheet3Data[1][1] = '2026-08-16'; // B2 등록일
  sheet3Data[2][1] = '홍길동'; // B3 이름
  sheet3Data[3][1] = '010-1234-5678'; // B4 연락처
  sheet3Data[4][1] = '오른손'; // B5 사용손
  sheet3Data[5][1] = '클래식'; // B6 투구 스타일
  sheet3Data[6][1] = 'Power Tip'; // B7 중지 팁종류
  sheet3Data[8][1] = '31/32'; // B9 중지 홀컷
  sheet3Data[9][1] = '1/4'; // B10 중지 리버스
  sheet3Data[10][1] = '0'; // B11 중지 포워드
  sheet3Data[11][1] = '-1/8'; // B12 중지 레터럴 (오른손 & - 수치 -> Right 1/8)
  sheet3Data[12][1] = '31'; // B13 중지 인서트
  sheet3Data[14][1] = '31/32'; // B15 약지 홀컷
  sheet3Data[15][1] = '1/4'; // B16 약지 리버스
  sheet3Data[16][1] = '0'; // B17 약지 포워드
  sheet3Data[17][1] = '1/8'; // B18 약지 레터럴 (오른손 & 양수 수치 -> Right 1/8)
  sheet3Data[18][1] = '31'; // B19 약지 인서트
  sheet3Data[20][1] = '4 1/2'; // B21 중지 Span
  sheet3Data[21][1] = '4 5/8'; // B22 약지 Span

  sheet3Data[0][4] = '1'; // E1 엄지 홀컷
  sheet3Data[1][4] = '1/8'; // E2 엄지 리버스
  sheet3Data[2][4] = '0'; // E3 엄지 포워드
  sheet3Data[3][4] = '1/16'; // E4 엄지 Left
  sheet3Data[4][4] = '0'; // E5 엄지 Right
  sheet3Data[5][4] = '원홀 특수 가공'; // E6 엄지 원홀
  sheet3Data[7][4] = '1/8 옵셋'; // E8 퍼플 1행
  sheet3Data[8][4] = '미세 각도 피팅'; // E9 퍼플 2행
  sheet3Data[11][4] = '1/16'; // E12 Bevel 1
  sheet3Data[12][4] = '1/32'; // E13 Bevel 2
  sheet3Data[14][4] = 'Oval 63'; // E15 오발 사이즈
  sheet3Data[15][4] = 'Straight'; // E16 오발 컷
  sheet3Data[16][3] = '그린 특수 매핑 메모'; // D17 그린 메모
  const sheet3 = XLSX.utils.aoa_to_sheet(sheet3Data);

  // 시트4: 서브 입력창
  const sheet4Data = Array.from({ length: 30 }, () => Array(6).fill(''));
  sheet4Data[1][1] = '2026-08-16'; // B2 등록일
  sheet4Data[2][1] = '홍길동'; // B3 이름
  sheet4Data[3][1] = '010-1234-5678'; // B4 연락처
  sheet4Data[4][1] = '오른손'; // B5 사용손
  sheet4Data[8][1] = '30/32'; // B9 서브 중지 홀컷 (자료 있음!)
  sheet4Data[9][1] = '1/8'; // B10 서브 중지 리버스
  sheet4Data[20][1] = '4 3/8'; // B21 서브 중지 Span
  sheet4Data[21][1] = '4 1/2'; // B22 서브 약지 Span
  const sheet4 = XLSX.utils.aoa_to_sheet(sheet4Data);

  XLSX.utils.book_append_sheet(wb, sheet1, '메인 차트 도면');
  XLSX.utils.book_append_sheet(wb, sheet2, '서브 차트 도면');
  XLSX.utils.book_append_sheet(wb, sheet3, '메인 입력창');
  XLSX.utils.book_append_sheet(wb, sheet4, '서브 입력창');

  const samplePath = path.join(__dirname, 'sample_drilling_chart.xlsx');
  XLSX.writeFile(wb, samplePath);
  console.log(`✅ 시범 테스트용 샘플 엑셀 생성 완수: ${samplePath}`);
  return samplePath;
}

createSampleExcel();
