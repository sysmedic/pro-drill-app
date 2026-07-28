// src/services/chartService.js
import { db, auth } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const saveDrillingData = async (chartData) => {
  // 1. 로그인 여부 확인
  if (!auth.currentUser) {
    window['alert']("로그인이 필요합니다.");
    return;
  }

  try {
    // 2. 'drilling_charts' 컬렉션에 데이터 추가
    const docRef = await addDoc(collection(db, "drilling_charts"), {
      ...chartData,                // 입력받은 지공 데이터 전체
      userId: auth.currentUser.uid, // 작성자 ID 저장 (나중에 본인 것만 불러올 때 사용)
      createdAt: serverTimestamp(), // 서버 시간 저장
    });
    
    console.log("저장 완료! 문서 ID:", docRef.id);
    window['alert']("지공 차트가 안전하게 저장되었습니다.");
  } catch (e) {
    console.error("데이터 저장 에러:", e);
    window['alert']("저장에 실패했습니다. 다시 시도해 주세요.");
  }
};