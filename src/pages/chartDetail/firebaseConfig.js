import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase 설정 (실제 프로젝트 설정으로 대체해야 합니다)
const firebaseConfig = {
  apiKey: "AIzaSyBd3iRcxYGyOovIadi4mLLLsRMkydu1KXo",
  authDomain: "drilling-chart-support.firebaseapp.com",
  projectId: "drilling-chart-support",
  storageBucket: "drilling-chart-support.firebasestorage.app",
  messagingSenderId: "1000564044773",
  appId: "1:1000564044773:web:fd1fcc5758c047f26db50c"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const functions = getFunctions(app); // Cloud Functions 추가