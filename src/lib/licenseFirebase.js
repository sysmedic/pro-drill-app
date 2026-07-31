import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 라이선스 관리용 신규 파이어베이스 프로젝트 컨피그 설정
const licenseConfig = {
  apiKey: import.meta.env?.VITE_LICENSE_FIREBASE_API_KEY || "mock_api_key",
  authDomain: import.meta.env?.VITE_LICENSE_FIREBASE_AUTH_DOMAIN || "mock_auth_domain",
  projectId: import.meta.env?.VITE_LICENSE_FIREBASE_PROJECT_ID || "mock_project_id",
  storageBucket: import.meta.env?.VITE_LICENSE_FIREBASE_STORAGE_BUCKET || "mock_storage_bucket",
  messagingSenderId: import.meta.env?.VITE_LICENSE_FIREBASE_MESSAGING_SENDER_ID || "mock_messaging_sender_id",
  appId: import.meta.env?.VITE_LICENSE_FIREBASE_APP_ID || "mock_app_id"
};

// 🔒 기존 구글 동기화용 파이어베이스 인스턴스와 충돌을 원천 방지하기 위해 
// 명시적 네임("LicenseApp")을 주입하여 격리된 독립 인스턴스로 이닛합니다.
export const licenseApp = initializeApp(licenseConfig, 'LicenseApp');
export const licenseDb = getFirestore(licenseApp);
