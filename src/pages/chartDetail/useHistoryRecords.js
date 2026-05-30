import { useCallback, useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, doc, updateDoc, query, where, orderBy, 
  serverTimestamp, onSnapshot, getDoc, writeBatch, increment
} from 'firebase/firestore';

export default function useHistoryRecords(customer, { refreshChartCount, setFeedback, onRenameSuccess } = {}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true); 

  // 💡 모달 위에서 일어나는 액션(이름변경/삭제) 제어 상태만 남기고 중복된 모달 열림 상태는 삭제했습니다.
  const [historyConfirm, setHistoryConfirm] = useState(null);
  const [renameRequest, setRenameRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  // 실시간 데이터 구독 (Real-time Sync)
  useEffect(() => {
    if (!auth.currentUser || !customer?.id) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'drilling_charts'),
      where('userId', '==', auth.currentUser.uid),
      where('customerId', '==', customer.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, 
          ...data,
          chartData: data.chartData || data.data || null,
          maintenanceLogs: data.maintenanceLogs || null
        };
      }));
      setLoading(false); 
    }, (error) => {
      console.error("차트 기록 불러오기 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [customer?.id]);

  // 차트 기록 저장 (최초 생성일 보존 로직 포함)
  const saveRecord = useCallback(async (record) => {
    if (!auth.currentUser) return { ok: false };

    try {
      const chartRef = doc(db, 'drilling_charts', record.id);
      const chartSnap = await getDoc(chartRef);
      const isBrandNew = !chartSnap.exists();
      const batch = writeBatch(db);
      
      const saveData = {
        ...record,
        userId: auth.currentUser.uid,
        customerId: customer.id,
      };

      if (isBrandNew) {
        saveData.createdAt = serverTimestamp();
      } else {
        saveData.createdAt = chartSnap.data()?.createdAt || serverTimestamp();
      }

      batch.set(chartRef, saveData);

      if (isBrandNew && auth.currentUser?.email) {
        const userRef = doc(db, 'users', auth.currentUser.email);
        batch.update(userRef, { chartCount: increment(1) });
      }

      await batch.commit();
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 저장 실패:", error);
      return { ok: false };
    }
  }, [customer?.id]);

  // 차트 기록 삭제
  const handleDeleteRecord = useCallback(async (id) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'drilling_charts', id));

      if (auth.currentUser?.email) {
        const userRef = doc(db, 'users', auth.currentUser.email);
        batch.update(userRef, { chartCount: increment(-1) });
      }

      await batch.commit();

      if (refreshChartCount) await refreshChartCount();
      if (setFeedback) setFeedback({ message: '저장 기록을 삭제했습니다.', tone: 'success' });
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 삭제 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 삭제를 반영하지 못했습니다.', title: '삭제 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [refreshChartCount, setFeedback]);

  // 차트 이름 변경
  const handleRenameRecord = useCallback(async (nextName) => {
    const trimmedName = nextName?.trim();
    if (!trimmedName || !renameRequest) return { ok: false, reason: 'empty' };

    try {
      await updateDoc(doc(db, 'drilling_charts', renameRequest.id), { name: trimmedName });
      if (onRenameSuccess) onRenameSuccess(renameRequest.id, trimmedName);
      setRenameRequest(null);
      if (setFeedback) setFeedback({ message: '저장 기록 이름을 변경했습니다.', tone: 'success' });
      return { ok: true };
    } catch (error) {
      console.error("차트 이름 변경 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 이름 변경을 반영하지 못했습니다.', title: '이름 변경 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [renameRequest, onRenameSuccess, setFeedback]);

  // 💡 중복 데이터 스트림과 무의미한 함수를 완전히 걷어낸 깔끔한 반환값
  return {
    history, 
    loading, 
    historyConfirm, 
    setHistoryConfirm, 
    renameRequest, 
    setRenameRequest,
    deleteRequest, 
    setDeleteRequest, 
    saveRecord, 
    handleDeleteRecord, 
    handleRenameRecord,
  };
}