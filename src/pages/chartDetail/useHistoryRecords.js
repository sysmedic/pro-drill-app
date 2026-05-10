import { useCallback, useState } from 'react';
import { loadChartHistory, saveChartHistory } from '../../lib/chartHistoryStorage.js';

export default function useHistoryRecords(customer) {
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const persistHistory = useCallback((nextHistory) => {
    setHistory(nextHistory);
    saveChartHistory(customer, nextHistory);
    return nextHistory;
  }, [customer]);

  const loadHistoryForCustomer = useCallback(() => {
    const loadedHistory = loadChartHistory(customer);
    setHistory(loadedHistory);
    return loadedHistory;
  }, [customer]);

  const saveRecord = useCallback((record) => {
    return persistHistory([record, ...history].slice(0, 20));
  }, [history, persistHistory]);

  const deleteRecord = useCallback((id) => {
    return persistHistory(history.filter(record => record.id !== id));
  }, [history, persistHistory]);

  const renameRecord = useCallback((id, nextName) => {
    const trimmedName = nextName?.trim();
    if (!trimmedName) return history;

    return persistHistory(history.map(record => (
      record.id === id ? { ...record, name: trimmedName } : record
    )));
  }, [history, persistHistory]);

  return {
    history,
    showHistoryModal,
    setShowHistoryModal,
    loadHistoryForCustomer,
    saveRecord,
    deleteRecord,
    renameRecord,
  };
}
