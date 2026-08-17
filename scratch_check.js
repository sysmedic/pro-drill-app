import { licenseDb } from './src/lib/licenseFirebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkApprovedBalls() {
  try {
    const colRef = collection(licenseDb, 'shared_bowling_balls');
    const snapshot = await getDocs(colRef);
    console.log(`🔥 Firebase shared_bowling_balls 실시간 문서 개수: ${snapshot.size}개`);
    snapshot.docs.forEach((doc, idx) => {
      const data = doc.data();
      console.log(`  [${idx+1}] ID: ${doc.id} | 모델명: ${data.officialName || data.model_name_kr || data.version_name || '미지정'} | 브랜드: ${data.brand || '기타'}`);
    });
  } catch (err) {
    console.error('Firebase 조회 에러:', err);
  }
}

checkApprovedBalls();
