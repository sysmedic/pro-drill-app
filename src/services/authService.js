import { auth, db } from "../firebase"; // 기존 설정 파일 경로
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 사용자 문서 참조 (이메일을 ID로 사용)
    const userRef = doc(db, "users", user.email);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // 신규 사용자라면 Phase 1 정책에 따라 문서 생성
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        joinedAt: serverTimestamp(), // 가입일
        tier: "trial_beta",          // 임시 베타
        status: "active",            // 활성 상태
        maxDevices: 1,               // 기기 제한 1대
        activeDevices: [],           // 현재 접속 기기 목록
      });
      console.log("신규 베타 사용자 등록 완료");
    }
    
    return user;
  } catch (error) {
    console.error("로그인 에러:", error);
    throw error;
  }
};