import { licenseDb } from './src/lib/licenseFirebase.js';
import { db as userDb } from './src/lib/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

async function checkAllFirebase() {
  console.log('🔍 [1] 라이선스/볼 공유 파이어베이스 (licenseDb) 점검...');
  try {
    const colRef1 = collection(licenseDb, 'shared_bowling_balls');
    const snap1 = await getDocs(colRef1);
    console.log(`  - shared_bowling_balls 문서 개수: ${snap1.size}개`);
    snap1.docs.forEach((doc, idx) => {
      console.log(`    [${idx+1}] ID: ${doc.id} | Data:`, doc.data());
    });
  } catch (e) {
    console.error('  - licenseDb 에러:', e.message);
  }

  console.log('\n🔍 [2] 기존 유저 동기화 파이어베이스 (userDb) 점검...');
  try {
    const colRef2 = collection(userDb, 'shared_bowling_balls');
    const snap2 = await getDocs(colRef2);
    console.log(`  - shared_bowling_balls 문서 개수: ${snap2.size}개`);
    snap2.docs.forEach((doc, idx) => {
      console.log(`    [${idx+1}] ID: ${doc.id} | Data:`, doc.data());
    });
  } catch (e) {
    console.error('  - userDb 에러:', e.message);
  }
}

checkAllFirebase();
