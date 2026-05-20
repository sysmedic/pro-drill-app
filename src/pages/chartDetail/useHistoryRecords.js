import { useCallback, useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
import { 
  collection, doc, setDoc, deleteDoc, updateDoc, 
  query, where, orderBy, limit, serverTimestamp, onSnapshot 
} from 'firebase/firestore';

export default function useHistoryRecords(customer, { refreshChartCount, setFeedback, onRenameSuccess } = {}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [historyConfirm, setHistoryConfirm] = useState(null);
  const [renameRequest, setRenameRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

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
      orderBy('createdAt', 'desc'),
      limit(20)
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

  const loadHistoryForCustomer = useCallback(async () => history, [history]);

  const saveRecord = useCallback(async (record) => {
    if (!auth.currentUser) return { ok: false };

    try {
      await setDoc(doc(db, 'drilling_charts', record.id), {
        ...record,
        userId: auth.currentUser.uid,
        customerId: customer.id,
        createdAt: serverTimestamp(), 
      });
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 저장 실패:", error);
      return { ok: false };
    }
  }, [customer?.id]);

  const handleDeleteRecord = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'drilling_charts', id));
      if (refreshChartCount) await refreshChartCount();
      if (setFeedback) setFeedback({ message: '저장 기록을 삭제했습니다.', tone: 'success' });
      return { ok: true };
    } catch (error) {
      console.error("차트 기록 삭제 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 삭제를 반영하지 못했습니다.', title: '삭제 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [refreshChartCount, setFeedback]);

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

  return {
    history, loading, showHistoryModal, setShowHistoryModal,
    historyConfirm, setHistoryConfirm, renameRequest, setRenameRequest,
    deleteRequest, setDeleteRequest, loadHistoryForCustomer,
    saveRecord, handleDeleteRecord, handleRenameRecord,
  };
}