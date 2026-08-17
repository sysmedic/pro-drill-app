import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 라이선스 및 볼링공 백업 공유용 파이어베이스 컨피그 설정
const licenseConfig = {
  apiKey: import.meta.env?.VITE_LICENSE_FIREBASE_API_KEY || import.meta.env?.VITE_GOOGLE_API_KEY || "AIzaSyCwwt-C0PTru5CeIuKD8K7Tqg5ldP7pHdg",
  authDomain: import.meta.env?.VITE_LICENSE_FIREBASE_AUTH_DOMAIN || "prodrill-license.firebaseapp.com",
  projectId: import.meta.env?.VITE_LICENSE_FIREBASE_PROJECT_ID || "prodrill-license",
  storageBucket: import.meta.env?.VITE_LICENSE_FIREBASE_STORAGE_BUCKET || "prodrill-license.appspot.com",
  messagingSenderId: import.meta.env?.VITE_LICENSE_FIREBASE_MESSAGING_SENDER_ID || "10982374619",
  appId: import.meta.env?.VITE_LICENSE_FIREBASE_APP_ID || "1:10982374619:web:a1b2c3d4e5f6"
};

// 🔒 기존 구글 동기화용 파이어베이스 인스턴스와 충돌을 원천 방지하기 위해 
// 명시적 네임("LicenseApp")을 주입하여 격리된 독립 인스턴스로 이닛합니다.
import { createLocalId } from './ids.js';

export const licenseApp = initializeApp(licenseConfig, 'LicenseApp');
export const licenseDb = getFirestore(licenseApp);

/**
 * 지공사/유저가 직접 입력한 공 제원을 파이어베이스 shared_bowling_balls에 백업 업로드
 */
export async function saveCustomBallToFirebase(ballData) {
  if (!ballData || !ballData.version_name) return null;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const ballRef = doc(licenseDb, 'shared_bowling_balls', ballData.id || createLocalId('custom'));
    await setDoc(ballRef, {
      ...ballData,
      created_at: new Date().toISOString(),
      source: 'user_direct_input_verified'
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Firebase shared_bowling_balls 백업 업로드 생략:', err);
    return false;
  }
}
