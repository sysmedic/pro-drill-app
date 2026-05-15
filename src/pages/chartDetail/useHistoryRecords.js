import { useCallback, useEffect, useState } from 'react';
import { db, auth } from '../../firebase'; // 파이어베이스 설정 파일 경로에 맞게 수정해주세요
import { 
  collection, doc, setDoc, deleteDoc, updateDoc, 
  query, where, orderBy, limit, serverTimestamp, onSnapshot 
} from 'firebase/firestore';

export default function useHistoryRecords(customer) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true); // 🔥 로딩 상태 추가 (데이터 대기용)
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // 1. 실시간 데이터 불러오기 (Read - onSnapshot 적용)
  useEffect(() => {
    // 유저 정보나 고객 정보가 없으면 빈 배열로 초기화
    if (!auth.currentUser || !customer?.id) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 내 데이터(userId) 중 특정 고객(customerId)의 차트를 최신순으로 20개 가져오는 쿼리
    const q = query(
      collection(db, 'drilling_charts'),
      where('userId', '==', auth.currentUser.uid),
      where('customerId', '==', customer.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    // 🔥 데이터가 변경될 때마다(혹은 처음 열 때) 자동으로 history 상태를 업데이트합니다.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedHistory = snapshot.docs.map(doc => ({
        id: doc.id, // 문서 ID를 데이터에 확실하게 포함
        ...doc.data()
      }));
      
      setHistory(loadedHistory);
      setLoading(false); // 데이터 도착 완료!
    }, (error) => {
      console.error("차트 기록 불러오기 실패:", error);
      setLoading(false);
    });

    // 컴포넌트가 닫히면 실시간 감시를 종료합니다.
    return () => unsubscribe();
  }, [customer?.id]);

  // 기존 코드 호환성을 위해 남겨둠 (이제 useEffect가 자동으로 처리하므로 직접 호출할 필요는 없음)
  const loadHistoryForCustomer = useCallback(async () => {
    return history;
  }, [history]);

  // 2. 새로운 기록 저장 (Create / Update)
  const saveRecord = useCallback(async (record) => {
    if (!auth.currentUser) return { ok: false };

    try {
      // 생성된 record.id를 문서 고유 ID로 그대로 사용합니다
      const docRef = doc(db, 'drilling_charts', record.id);
      
      const payload = {
        ...record,
        userId: auth.currentUser.uid,
        customerId: customer.id,
        createdAt: serverTimestamp(), // 서버 기준 시간
      };

      // 파이어베이스에 저장 (onSnapshot이 켜져 있으므로 setHistory를 직접 안 해도 자동 반영됨)
      await setDoc(docRef, payload);
      
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 저장 실패:", error);
      return { ok: false };
    }
  }, [customer]);

  // 3. 기록 삭제 (Delete)
  const deleteRecord = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'drilling_charts', id));
      // 자동 반영되므로 상태 수동 업데이트 제거
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 삭제 실패:", error);
      return { ok: false };
    }
  }, []);

  // 4. 기록 이름 변경 (Update)
  const renameRecord = useCallback(async (id, nextName) => {
    const trimmedName = nextName?.trim();
    if (!trimmedName) return { ok: false, reason: 'empty' };

    try {
      // 해당 문서의 'name' 필드만 업데이트
      await updateDoc(doc(db, 'drilling_charts', id), { name: trimmedName });
      // 자동 반영되므로 상태 수동 업데이트 제거
      return { ok: true };
    } catch (error) {
      console.error("차트 이름 변경 실패:", error);
      return { ok: false };
    }
  }, []);

  return {
    history,
    loading, // 🔥 새로 추가된 로딩 상태 반환
    showHistoryModal,
    setShowHistoryModal,
    loadHistoryForCustomer,
    saveRecord,
    deleteRecord,
    renameRecord,
  };
}