import { useState, useEffect, useCallback } from 'react';
import { 
  loadChartHistory, 
  saveChartHistory 
} from '../../lib/chartHistoryStorage.js';
import { autoSyncOnChange } from '../../lib/syncService.js'; // ☁️ 실시간 백업 트리거 임포트

export default function useHistoryRecords(customer, { refreshChartCount, setFeedback, onRenameSuccess } = {}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true); 

  const [historyConfirm, setHistoryConfirm] = useState(null);
  const [renameRequest, setRenameRequest] = useState(null);
  const [deleteRequest, setDeleteRequest] = useState(null);

  // 로컬 IndexedDB에서 차트 기록 로드
  const fetchLocalHistory = useCallback(async () => {
    if (!customer?.id) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const records = await loadChartHistory(customer);
      // 최신순으로 정렬
      const sorted = [...records].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setHistory(sorted);
    } catch (error) {
      console.error("차트 기록 불러오기 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [customer]);

  useEffect(() => {
    fetchLocalHistory();
  }, [fetchLocalHistory]);

  // [C/U] 지공 차트 생성 및 갱신 파이프라인 (IndexedDB 기반)
  const saveRecord = useCallback(async (record) => {
    try {
      const isoTimestamp = new Date().toISOString();
      let updatedHistory = [...history];

      const existingIndex = history.findIndex(h => h.id === record.id);
      const isBrandNew = existingIndex === -1;

      const updatedRecord = {
        ...record,
        updatedAt: isoTimestamp,
        createdAt: isBrandNew ? isoTimestamp : (history[existingIndex].createdAt || isoTimestamp)
      };

      if (isBrandNew) {
        updatedHistory.unshift(updatedRecord);
      } else {
        updatedHistory[existingIndex] = updatedRecord;
      }

      const saveKey = await saveChartHistory(customer, updatedHistory);
      if (saveKey) {
        setHistory(updatedHistory);
        if (refreshChartCount) await refreshChartCount();
        autoSyncOnChange(); // ☁️ 변경사항 자동 백업 트리거
        return { ok: true };
      }
      return { ok: false };
    } catch (error) {
      console.error("차트 기록 저장 실패:", error);
      return { ok: false };
    }
  }, [customer, history, refreshChartCount]);

  // [D] 지공 차트 개별 영구 파괴 파이프라인
  const handleDeleteRecord = useCallback(async (id) => {
    try {
      const updatedHistory = history.filter(h => h.id !== id);
      const saveKey = await saveChartHistory(customer, updatedHistory);

      if (saveKey) {
        setHistory(updatedHistory);
        if (refreshChartCount) await refreshChartCount();
        if (setFeedback) setFeedback({ message: '저장 기록을 삭제했습니다.', tone: 'success' });
        autoSyncOnChange(); // ☁️ 변경사항 자동 백업 트리거
        return { ok: true };
      }
      return { ok: false };
    } catch (error) {
      console.error("차트 기록 삭제 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 삭제를 반영하지 못했습니다.', title: '삭제 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [customer, history, refreshChartCount, setFeedback]);

  // [U] 지공 차트 공 이름 타이틀 단독 변경 파이프라인
  const handleRenameRecord = useCallback(async (nextName) => {
    const trimmedName = nextName?.trim();
    if (!trimmedName || !renameRequest) return { ok: false, reason: 'empty' };

    try {
      const updatedHistory = history.map(h => 
        h.id === renameRequest.id 
          ? { ...h, name: trimmedName, updatedAt: new Date().toISOString() } 
          : h
      );

      const saveKey = await saveChartHistory(customer, updatedHistory);
      if (saveKey) {
        setHistory(updatedHistory);
        if (onRenameSuccess) onRenameSuccess(renameRequest.id, trimmedName);
        setRenameRequest(null);
        if (setFeedback) setFeedback({ message: '저장 기록 이름을 변경했습니다.', tone: 'success' });
        autoSyncOnChange(); // ☁️ 변경사항 자동 백업 트리거
        return { ok: true };
      }
      return { ok: false };
    } catch (error) {
      console.error("차트 이름 변경 실패:", error);
      if (setFeedback) setFeedback({ message: '저장 기록 이름 변경을 반영하지 못했습니다.', title: '이름 변경 실패', tone: 'danger' });
      return { ok: false };
    }
  }, [customer, renameRequest, onRenameSuccess, setFeedback, history]);

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
    refreshHistory: fetchLocalHistory
  };
}