import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 👇 우리가 지공차트 앱에서 사용할 인증과 데이터베이스 모듈을 추가로 불러옵니다.
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBd3iRcxYGyOovIadi4mLLLsRMkydu1KXo",
  authDomain: "drilling-chart-support.firebaseapp.com",
  projectId: "drilling-chart-support",
  storageBucket: "drilling-chart-support.firebasestorage.app",
  messagingSenderId: "1000564044773",
  appId: "1:1000564044773:web:fd1fcc5758c047f26db50c",
  measurementId: "G-4411F1SB00"
};

// 파이어베이스 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 👇 앱 전체에서 사용할 수 있도록 auth, googleProvider, db를 세팅하고 밖으로 내보냅니다(export).
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// 👇 인터넷이 끊겼을 때도 지공 차트를 볼 수 있도록 오프라인 모드를 켭니다.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log("여러 탭이 열려 있어 오프라인 모드를 켤 수 없습니다.");
  } else if (err.code === 'unimplemented') {
    console.log("현재 브라우저가 오프라인 모드를 지원하지 않습니다.");
  }
});