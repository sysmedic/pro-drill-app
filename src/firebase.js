import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBd3iRcxYGyOovIadi4mLLLsRMkydu1KXo",
  authDomain: "drilling-chart-support.firebaseapp.com",
  projectId: "drilling-chart-support",
  storageBucket: "drilling-chart-support.firebasestorage.app",
  messagingSenderId: "1000564044773",
  appId: "1:1000564044773:web:fd1fcc5758c047f26db50c",
  measurementId: "G-4411F1SB00"
};

// 중복 초기화 방지
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// 🟢 [Vite 핫리로딩 크래시 방지] 최초 1회만 오프라인 지속성을 켜도록 전역 플래그 설정
if (typeof window !== 'undefined' && !window.__firestore_persistence_initialized__) {
  window.__firestore_persistence_initialized__ = true; // 플래그 선언
  
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.log("⚠️ 여러 탭이 열려 있어 오프라인 모드를 켤 수 없습니다.");
      } else if (err.code === 'unimplemented') {
        console.log("⚠️ 현재 브라우저가 오프라인 모드를 지원하지 않습니다.");
      }
    });
  } catch (err) {
    console.warn("⚠️ 오프라인 모드가 이미 활성화되어 건너뜁니다 (HMR).");
  }
}