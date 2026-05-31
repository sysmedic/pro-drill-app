import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// 🟢 [수정 완료] 다중 탭 관리를 위한 persistentMultipleTabManager 임포트 추가
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  getFirestore 
} from "firebase/firestore"; 
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

// 앱 초기화가 이루어지기 전, '진짜 최초 로드 상태(HMR이 아닌 상태)'인지 판별하여 기억합니다.
const isFirstLoad = getApps().length === 0;

const app = isFirstLoad ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// 🌟 [정밀 추가]: 로그아웃 후 버튼을 누르면 브라우저의 구글 자동 로그인 세션을 무시하고 무조건 계정 선택 모달을 새로 띄웁니다.
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// 🟢 [수정 완료] 최신 규격(localCache) 내부에 다중 탭 관리자(tabManager) 옵션을 결합하여 주입합니다.
// 최초 로드 시에만 이 고성능 캐시 세팅이 인스턴스에 고정 할당됩니다.
export const db = isFirstLoad 
  ? initializeFirestore(app, { 
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }) 
    }) 
  : getFirestore(app);

export const functions = getFunctions(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;