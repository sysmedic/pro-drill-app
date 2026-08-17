import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const licenseConfig = {
  apiKey: process.env.VITE_LICENSE_FIREBASE_API_KEY || process.env.VITE_GOOGLE_API_KEY || "AIzaSyCwwt-C0PTru5CeIuKD8K7Tqg5ldP7pHdg",
  authDomain: "prodrill-license.firebaseapp.com",
  projectId: "prodrill-license",
  storageBucket: "prodrill-license.appspot.com",
  messagingSenderId: "10982374619",
  appId: "1:10982374619:web:a1b2c3d4e5f6"
};

const app = initializeApp(licenseConfig, 'FetchApprovedApp');
const licenseDb = getFirestore(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchApprovedBalls() {
  console.log('🚀 [배포 빌드 파이프라인] 파이어베이스 승인(approved) 팩트 DB 자동 수집 및 합침 가동...');
  
  const publicDbPath = path.join(__dirname, '../public/data/bowling_balls.json');
  let currentBalls = [];
  
  if (fs.existsSync(publicDbPath)) {
    try {
      const raw = fs.readFileSync(publicDbPath, 'utf-8');
      currentBalls = JSON.parse(raw) || [];
    } catch {
      currentBalls = [];
    }
  }

  try {
    const restUrl = 'https://firestore.googleapis.com/v1/projects/prodrill-license/databases/(default)/documents/shared_bowling_balls';
    const res = await fetch(restUrl);
    const approvedItems = [];

    if (res.ok) {
      const body = await res.json();
      const docs = body.documents || [];
      console.log(`📦 Firestore 감지 문서 ${docs.length}건 수집 완료!`);

      docs.forEach(docObj => {
        const fields = docObj.fields || {};
        const getStr = (f) => f?.stringValue || '';
        const getNum = (f) => f?.doubleValue !== undefined ? f.doubleValue : (f?.integerValue !== undefined ? parseInt(f.integerValue) : null);
        
        const statusVal = getStr(fields.status);
        const sourceVal = getStr(fields.source);

        if (statusVal === 'approved' || sourceVal === 'user_direct_input_verified') {
          const ballName = getStr(fields.ballName) || getStr(fields.model_name_kr) || '크레이즈 하이브리드';
          const weightStr = getStr(fields.weight) || '15lb';
          const weightNum = weightStr.replace(/[^0-9]/g, '') || '15';
          const weightKey = `${weightNum}lb`;

          const unifiedItem = {
            id: getStr(fields.id) || docObj.name.split('/').pop(),
            series: ballName.split(' ')[0] || 'Fact',
            version_name: ballName,
            brand: getStr(fields.brand) || 'Driller Custom',
            distributor: '현장 지공사 검증 승인 팩트 DB',
            model_name_kr: ballName,
            model_name_en: getStr(fields.model_name_en) || ballName,
            alias: [ballName, ballName.replace(/\s/g, '')],
            usbc_approved_date: null,
            coverstock: {
              name: getStr(fields.coverstock) || 'RAGE HYBRID',
              type: 'Hybrid',
              factory_finish: getStr(fields.finish) || '#1500 POLISH'
            },
            core: {
              name: `${ballName} Core`,
              type: getStr(fields.coreType) || 'Symmetric'
            },
            specs_by_weight: {
              [weightKey]: {
                rg: getNum(fields.rg) !== null ? getNum(fields.rg) : 2.511,
                diff: getNum(fields.diff) !== null ? getNum(fields.diff) : 0.035,
                int_diff: getNum(fields.intDiff)
              }
            },
            rg: getNum(fields.rg) !== null ? getNum(fields.rg) : 2.511,
            diff: getNum(fields.diff) !== null ? getNum(fields.diff) : 0.035,
            oilCondition: 'Medium Oil',
            is_custom_user_ball: true,
            source: 'user_direct_input_verified',
            contributedBy: getStr(fields.contributedBy) || 'master_driller',
            updated_at: new Date().toISOString().substring(0, 10)
          };
          approvedItems.push(unifiedItem);
        }
      });
    }

    // ID 기반 병합 (새 승인 항목으로 오버라이드)
    const idMap = new Map();
    currentBalls.forEach(b => { if (b.id) idMap.set(b.id, b); });
    approvedItems.forEach(b => { if (b.id) idMap.set(b.id, b); });

    const mergedBalls = Array.from(idMap.values());
    fs.writeFileSync(publicDbPath, JSON.stringify(mergedBalls, null, 2), 'utf-8');
    
    // 바탕화면 동기화 파일도 업데이트
    const desktopPath = '/Users/sysmedic/Desktop/ProDrill_Clean_Fact_Balls.json';
    try {
      fs.writeFileSync(desktopPath, JSON.stringify(mergedBalls, null, 2), 'utf-8');
    } catch { /* ignore desktop sync error */ }

    printSummary(mergedBalls.length, approvedItems.length);
  } catch (err) {
    console.warn('⚠️ 승인 팩트 DB 자동 수집 중 경고 (기존 시드 유지):', err.message);
  }
}

function printSummary(total, approvedCount) {
  console.log(`✅ [배포 반영 완료] 총 ${total}개 볼링공 (승인 팩트 ${approvedCount}개 합침 완료)`);
}

fetchApprovedBalls().then(() => {
  process.exit(0);
}).catch(() => {
  process.exit(0);
});
