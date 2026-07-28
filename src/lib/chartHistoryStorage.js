import { 
  getChartHistory, 
  saveLocalChartHistory, 
  deleteLocalChartHistory 
} from './indexedDbConnector.js';
import { CHART_HISTORY_PREFIX, LEGACY_CHART_HISTORY_PREFIX, PRE_V7_CHART_HISTORY_PREFIX } from './storageKeys.js';

const isObjectRecord = (value) => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

const isNonEmptyValue = (value) => (
  typeof value === 'number' ||
  (typeof value === 'string' && value.trim().length > 0)
);

const normalizeHistoryRecord = (record) => {
  if (!isObjectRecord(record)) return null;

  const hasRecordIdentity = (
    isNonEmptyValue(record.id) ||
    isNonEmptyValue(record.name) ||
    isNonEmptyValue(record.timestamp) ||
    isObjectRecord(record.data)
  );

  if (!hasRecordIdentity) return null;

  return {
    ...record,
    ...(typeof record.name === 'string' ? { name: record.name.trim() } : {}),
    ...(typeof record.timestamp === 'string' ? { timestamp: record.timestamp.trim() } : {}),
  };
};

export const normalizeChartHistory = (history) => (
  Array.isArray(history)
    ? history.map(normalizeHistoryRecord).filter(Boolean)
    : []
);

// 💡 [테스트 & 폴백 지원]: 마이그레이션 전이거나 테스트용 목 스토리지가 있는 경우 localStorage 동기 대조
export const loadChartHistory = (customer, storage) => {
  if (!customer || !customer.id) {
    return storage ? [] : Promise.resolve([]);
  }

  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';

  if (store && (storage || !migrated)) {
    try {
      const primaryKey = `${CHART_HISTORY_PREFIX}${customer.id}`;
      
      const raw = store.getItem(primaryKey);
      let v8History = [];
      if (raw) {
        v8History = normalizeChartHistory(JSON.parse(raw));
      }

      if (v8History.length > 0) {
        return v8History;
      }

      let legacyHistory = [];
      const legacyKey = `${LEGACY_CHART_HISTORY_PREFIX}${customer.name || ''}`;
      const legacyRaw = store.getItem(legacyKey);
      if (legacyRaw) {
        try { legacyHistory = normalizeChartHistory(JSON.parse(legacyRaw)); } catch { /* ignore */ }
      }

      let preV7History = [];
      const preV7Key = `${PRE_V7_CHART_HISTORY_PREFIX}${customer.name || ''}`;
      const preV7Raw = store.getItem(preV7Key);
      if (preV7Raw) {
        try { preV7History = normalizeChartHistory(JSON.parse(preV7Raw)); } catch { /* ignore */ }
      }

      const mergedMap = new Map();
      preV7History.forEach(item => { if (item && item.id) mergedMap.set(item.id, item); });
      legacyHistory.forEach(item => { if (item && item.id) mergedMap.set(item.id, item); });
      
      const finalHistory = Array.from(mergedMap.values());

      if (finalHistory.length > 0) {
        try {
          store.setItem(primaryKey, JSON.stringify(finalHistory));
        } catch { /* ignore */ }
        return finalHistory;
      }

      return [];
    } catch {
      return [];
    }
  }

  // 실 운영 모드: IndexedDB 비동기 구동
  return (async () => {
    try {
      const history = await getChartHistory(customer.id);
      return normalizeChartHistory(history);
    } catch (error) {
      console.error("지공 히스토리 로드 실패:", error);
      return [];
    }
  })();
};

export const saveChartHistory = (customer, history, storage) => {
  if (!customer || !customer.id) {
    return storage ? null : Promise.resolve(null);
  }
  if (!Array.isArray(history)) {
    return storage ? null : Promise.resolve(null);
  }
  const normalized = normalizeChartHistory(history);

  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';

  if (store && (storage || !migrated)) {
    try {
      const key = `${CHART_HISTORY_PREFIX}${customer.id}`;
      store.setItem(key, JSON.stringify(normalized));
      if (!storage) {
        saveLocalChartHistory(customer.id, normalized).catch(e => console.error(e));
      }
      return key; // 🎯 저장 성공 시 실제 스토리지 키(chart_history_v8_*) 반환 명세 준수
    } catch {
      return null;
    }
  }

  return (async () => {
    try {
      const success = await saveLocalChartHistory(customer.id, normalized);
      return success ? `${CHART_HISTORY_PREFIX}${customer.id}` : null;
    } catch (error) {
      console.error("지공 히스토리 저장 실패:", error);
      return null;
    }
  })();
};

export const renameChartHistory = (renameReq, storage) => {
  const id = renameReq?.id;
  const oldName = renameReq?.oldName;
  if (!id) {
    return storage ? [] : Promise.resolve([]);
  }

  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';

  if (store && (storage || !migrated)) {
    try {
      const primaryKey = `${CHART_HISTORY_PREFIX}${id}`;
      const legacyKey = `${LEGACY_CHART_HISTORY_PREFIX}${oldName || ''}`;
      const preV7Key = `${PRE_V7_CHART_HISTORY_PREFIX}${oldName || ''}`;

      let v8History = [];
      const primaryRaw = store.getItem(primaryKey);
      if (primaryRaw) {
        try { v8History = normalizeChartHistory(JSON.parse(primaryRaw)); } catch { /* ignore */ }
      }

      let legacyHistory = [];
      let legacyParseOk = false;
      const legacyRaw = store.getItem(legacyKey);
      if (legacyRaw) {
        try { 
          legacyHistory = normalizeChartHistory(JSON.parse(legacyRaw)); 
          legacyParseOk = true; 
        } catch {
          legacyParseOk = false;
        }
      }

      let preV7History = [];
      let preV7ParseOk = false;
      const preV7Raw = store.getItem(preV7Key);
      if (preV7Raw) {
        try { 
          preV7History = normalizeChartHistory(JSON.parse(preV7Raw)); 
          preV7ParseOk = true; 
        } catch {
          preV7ParseOk = false;
        }
      }

      // 🎯 v8History 우선순위 병합 및 Map insertion order 보정 (v8 기록이 앞에 오게 정렬)
      const mergedMap = new Map();
      v8History.forEach(item => { if (item && item.id !== undefined) mergedMap.set(item.id, item); });
      
      legacyHistory.forEach(item => { 
        if (item && item.id !== undefined && !mergedMap.has(item.id)) {
          mergedMap.set(item.id, item); 
        }
      });
      
      preV7History.forEach(item => { 
        if (item && item.id !== undefined && !mergedMap.has(item.id)) {
          mergedMap.set(item.id, item); 
        }
      });

      const finalHistory = Array.from(mergedMap.values());

      store.setItem(primaryKey, JSON.stringify(finalHistory));

      // 정상 파싱 완료된 레거시 데이터만 삭제
      if (legacyParseOk) {
        store.removeItem(legacyKey);
      }
      if (preV7ParseOk) {
        store.removeItem(preV7Key);
      }

      return finalHistory;
    } catch {
      try {
        const legacyKey = `${LEGACY_CHART_HISTORY_PREFIX}${oldName || ''}`;
        const legacyRaw = store.getItem(legacyKey);
        if (legacyRaw) {
          return normalizeChartHistory(JSON.parse(legacyRaw));
        }
      } catch { /* ignore */ }
      return [];
    }
  }

  return (async () => {
    try {
      const history = await getChartHistory(id);
      return normalizeChartHistory(history);
    } catch (error) {
      console.error("지공 히스토리 이름 변경 대응 조회 실패:", error);
      return [];
    }
  })();
};

export const deleteChartHistory = (customer, storage) => {
  if (!customer || !customer.id) {
    return storage ? false : Promise.resolve(false);
  }

  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';

  if (store && (storage || !migrated)) {
    try {
      const key = `${CHART_HISTORY_PREFIX}${customer.id}`;
      const legacyKey = `${LEGACY_CHART_HISTORY_PREFIX}${customer.name || ''}`;
      const preV7Key = `${PRE_V7_CHART_HISTORY_PREFIX}${customer.name || ''}`;

      // v8 기록 사전 복사 보관
      const v8Raw = store.getItem(key);
      let v8History = [];
      if (v8Raw) {
        try { v8History = normalizeChartHistory(JSON.parse(v8Raw)); } catch { /* ignore */ }
      }

      const exists = store.has
        ? (store.has(key) || store.has(legacyKey) || store.has(preV7Key))
        : !!(store.getItem(key) || store.getItem(legacyKey) || store.getItem(preV7Key));
      
      // v8 기록은 언제나 무조건 삭제
      store.removeItem(key);

      // 레거시 삭제 자격 판정
      const legacyRaw = store.getItem(legacyKey);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          const normalized = normalizeChartHistory(parsed);
          
          if (normalized.length === 0) {
            store.removeItem(legacyKey);
          } else {
            // v8에 legacy의 모든 기록이 id 매핑 상 이미 머지되어 안전해진 경우에만 삭제 가능
            const v8Ids = new Set(v8History.map(item => item.id));
            const isFullyMerged = normalized.every(item => v8Ids.has(item.id));
            if (isFullyMerged) {
              store.removeItem(legacyKey);
            }
          }
        } catch {
          // 파싱에 실패한 깨진 파일은 유실 방지를 위해 보존
        }
      }

      // preV7 삭제 자격 판정
      const preV7Raw = store.getItem(preV7Key);
      if (preV7Raw) {
        try {
          const parsed = JSON.parse(preV7Raw);
          const normalized = normalizeChartHistory(parsed);
          
          if (normalized.length === 0) {
            store.removeItem(preV7Key);
          } else {
            const v8Ids = new Set(v8History.map(item => item.id));
            const isFullyMerged = normalized.every(item => v8Ids.has(item.id));
            if (isFullyMerged) {
              store.removeItem(preV7Key);
            }
          }
        } catch {
          // 파싱에 실패한 깨진 파일은 유실 방지를 위해 보존
        }
      }
      
      return exists;
    } catch {
      return false;
    }
  }

  return (async () => {
    try {
      await deleteLocalChartHistory(customer.id);
      return true;
    } catch (error) {
      console.error("지공 히스토리 삭제 실패:", error);
      return false;
    }
  })();
};
