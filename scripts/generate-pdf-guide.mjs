import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

async function generatePdf() {
  console.log('Generating ProDrill PDF Manual...');

  const logoPath = resolve('public/icon-512.png');
  const logoBase64 = readFileSync(logoPath).toString('base64');
  const logoDataUrl = `data:image/png;base64,${logoBase64}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>ProDrill CHART 앱 설치 및 기본 설정 가이드</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;800;900&display=swap');

    @page {
      size: A4;
      margin: 8mm 12mm 8mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 12.5px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .header-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
      color: #ffffff;
      padding: 16px 22px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 18px;
      margin-bottom: 14px;
      box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.2);
    }

    .logo-img {
      width: 68px;
      height: 68px;
      border-radius: 14px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
      background: #000;
    }

    .header-text h1 {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
      color: #ffffff;
    }

    .header-text p {
      font-size: 12px;
      color: #cbd5e1;
      font-weight: 600;
    }

    .url-badge {
      display: inline-block;
      margin-top: 6px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #a5b4fc;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11.5px;
    }

    .section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 2px solid #cbd5e1;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }

    .card-title {
      font-size: 12px;
      font-weight: 800;
      color: #1e1b4b;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .steps-list {
      list-style: none;
      font-size: 11.5px;
      color: #334155;
    }

    .steps-list li {
      margin-bottom: 4px;
      position: relative;
      padding-left: 14px;
      line-height: 1.35;
    }

    .steps-list li::before {
      content: "•";
      color: #4f46e5;
      font-weight: 900;
      position: absolute;
      left: 2px;
      top: 0;
    }

    .highlight-badge {
      background: #eef2ff;
      color: #4338ca;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid #c7d2fe;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .footer-note {
      text-align: center;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #cbd5e1;
      font-size: 10.5px;
      color: #64748b;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <!-- 헤더 브랜딩 -->
  <div class="header-card">
    <img src="${logoDataUrl}" alt="ProDrill Logo" class="logo-img" />
    <div class="header-text">
      <h1>ProDrill CHART 앱 설치 & 기본 설정 가이드</h1>
      <p>프로 볼링 지공사를 위한 모바일/태블릿 PWA 지공 매니저</p>
      <div class="url-badge">https://drilling-chart-psi.vercel.app</div>
    </div>
  </div>

  <!-- 1. 앱 설치 방법 (홈 화면에 추가) -->
  <div class="section">
    <div class="section-title">
      <span>📲 1. 기기별 10초 앱 설치 방법 (홈 화면에 추가)</span>
    </div>
    <div class="grid-3">
      
      <!-- iOS -->
      <div class="card">
        <div class="card-title">
          <span>🍎 iPhone / iPad (iOS Safari)</span>
        </div>
        <ul class="steps-list">
          <li><strong>Safari 브라우저</strong>로 접속 주소 입력</li>
          <li>하단 중앙 <span class="highlight-badge">공유 버튼 [↑]</span> 터치</li>
          <li>아래로 스크롤하여 <span class="highlight-badge">[홈 화면에 추가]</span> 터치</li>
          <li>우측 상단 <span class="highlight-badge">[추가]</span> 누르면 설치 완료!</li>
        </ul>
      </div>

      <!-- Android -->
      <div class="card">
        <div class="card-title">
          <span>🤖 Android (삼성 인터넷 / 크롬)</span>
        </div>
        <ul class="steps-list">
          <li><strong>크롬</strong> 또는 <strong>삼성 인터넷</strong>으로 접속</li>
          <li>우측 상단 <span class="highlight-badge">메뉴 [⋮]</span> 버튼 터치</li>
          <li><span class="highlight-badge">[앱 설치]</span> 또는 <span class="highlight-badge">[홈 화면에 추가]</span> 선택</li>
          <li>확인 팝업에서 <span class="highlight-badge">[설치]</span> 선택 시 완료!</li>
        </ul>
      </div>

      <!-- PC/Mac -->
      <div class="card">
        <div class="card-title">
          <span>💻 PC / Mac (Chrome 데스크톱)</span>
        </div>
        <ul class="steps-list">
          <li><strong>Chrome 브라우저</strong>로 접속 주소 입력</li>
          <li>주소창 우측 끝 <span class="highlight-badge">[앱 설치]</span> 아이콘 클릭</li>
          <li>독립 데스크톱 앱으로 즉시 설치 완료!</li>
        </ul>
      </div>

    </div>
  </div>

  <!-- 2. 구글 백업 & 보안 설정 -->
  <div class="section">
    <div class="section-title">
      <span>🔑 2. 0초 구글 백업 연동 및 사생활 보호 설정</span>
    </div>
    <div class="feature-grid">
      
      <div class="card">
        <div class="card-title">
          <span>☁️ 0초 구글 드라이브 동기화</span>
        </div>
        <ul class="steps-list">
          <li>바탕화면의 <strong>ProDrill 앱 아이콘</strong>을 터치하여 실행합니다.</li>
          <li>첫 화면 안내창에서 <span class="highlight-badge">[구글 계정 연결하기]</span>를 선택합니다.</li>
          <li>본인 구글 이메일을 연동하면 차트 작성 시 <strong>자동 백업</strong>이 가동됩니다.</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">
          <span>🔒 앱 비번 잠금 & 차트 보호 화면</span>
        </div>
        <ul class="steps-list">
          <li>우측 상단 <strong>환경 설정(⚙️)</strong> ➔ 앱 비밀번호 4자리를 설정할 수 있습니다.</li>
          <li>지공 도면 영역을 <strong>3회 연속 터치</strong>하면 차트 수치가 즉시 가려집니다.</li>
          <li>손님 방문 시 개인정보 및 차트 보안을 완벽하게 보호합니다.</li>
        </ul>
      </div>

    </div>
  </div>

  <!-- 3. 지공 차트 작성 퀵 스타트 -->
  <div class="section">
    <div class="section-title">
      <span>🎳 3. 지공 차트 작성 퀵 스타트</span>
    </div>
    <div class="feature-grid">
      
      <div class="card">
        <div class="card-title">
          <span>📐 3D/2D 도면 및 전용 키패드</span>
        </div>
        <ul class="steps-list">
          <li><strong>투구 스타일:</strong> 쓰리핑거 / 덤리스(투핸드) 선택 시 엄지 수치 자동 정돈</li>
          <li><strong>정밀 키패드:</strong> 스판/피치 수치 터치 시 1/16, 1/32 분수 수치 정밀 입력</li>
          <li><strong>도면 메모 핀:</strong> 도면 위 중지/약지/엄지 부근을 터치하여 작업 노하우 기록</li>
        </ul>
      </div>

      <div class="card">
        <div class="card-title">
          <span>⚡ 2LS / Dual Angle 연산 & AI 추천</span>
        </div>
        <ul class="steps-list">
          <li><strong>0초 상호 변환:</strong> Dual Angle 수치 ↔️ Storm 2LS 수치 자동 계산</li>
          <li><strong>AI 추천:</strong> 볼러스펙 기반 4종 레이아웃 AI 추천 및 자동 적용</li>
          <li><strong>NFC 및 히스토리:</strong> 지공 이력 관리 및 NFC 태그 즉시 연동 지원</li>
        </ul>
      </div>

    </div>
  </div>

  <!-- 푸터 노트 -->
  <div class="footer-note">
    ProDrill CHART • 프로페셔널 지공 매니저 | 공식 접속 주소: https://drilling-chart-psi.vercel.app
  </div>

</body>
</html>
  `;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  const projectPdfPath = resolve('ProDrill_Setup_Guide.pdf');
  const artifactPdfPath = resolve('/Users/sysmedic/.gemini/antigravity-ide/brain/775b29f1-93e5-45de-82ab-1416a42c5fa2/ProDrill_Setup_Guide.pdf');

  await page.pdf({
    path: projectPdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '8mm',
      bottom: '8mm',
      left: '10mm',
      right: '10mm',
    },
  });

  await page.pdf({
    path: artifactPdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '8mm',
      bottom: '8mm',
      left: '10mm',
      right: '10mm',
    },
  });

  await browser.close();
  console.log(`PDF successfully generated at:\n1. ${projectPdfPath}\n2. ${artifactPdfPath}`);
}

generatePdf().catch((err) => {
  console.error('Failed to generate PDF:', err);
  process.exit(1);
});
