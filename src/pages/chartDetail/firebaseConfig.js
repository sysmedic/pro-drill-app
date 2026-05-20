import { initializeApp, getApps, getApp } from 'firebase/app'; // 🟢 중복 방지를 위해 getApps, getApp 추가
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBd3iRcxYGyOovIadi4mLLLsRMkydu1KXo",
  authDomain: "drilling-chart-support.firebaseapp.com",
  projectId: "drilling-chart-support",
  storageBucket: "drilling-chart-support.firebasestorage.app",
  messagingSenderId: "1000564044773",
  appId: "1:1000564044773:web:fd1fcc5758c047f26db50c"
};

// 🟢 Firebase 초기화 (이미 켜져 있으면 기존 앱 재사용, 없으면 신규 생성)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const functions = getFunctions(app); // Cloud Functions 추가