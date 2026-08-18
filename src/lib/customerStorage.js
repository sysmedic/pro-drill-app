import { getAllCustomers, saveLocalCustomers } from './indexedDbConnector.js';
import { normalizeCustomers } from './customerSchema.js';
import { CUSTOMERS_KEY } from './storageKeys.js';

export const DELETED_CUSTOMERS_KEY = 'prodrill_deleted_customers';

export const getDeletedCustomerIds = () => {
  try {
    const store = typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
    if (!store) return [];
    const raw = store.getItem(DELETED_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const registerDeletedCustomer = (customerId) => {
  if (!customerId) return;
  try {
    const store = typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null);
    if (!store) return;
    const list = getDeletedCustomerIds();
    if (!list.includes(customerId)) {
      list.push(customerId);
      store.setItem(DELETED_CUSTOMERS_KEY, JSON.stringify(list));
    }
  } catch { /* ignore */ }
};

export const readCustomers = (storage, accountHashKey = null) => {
  // 💡 [SSR 격리 대응]: globalThis.localStorage 표준 폴백 대조 (global 에러 방지)
  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  
  const deletedIds = getDeletedCustomerIds();
  const filterDeleted = (list) => {
    if (!Array.isArray(list)) return [];
    if (deletedIds.length === 0) return list;
    return list.filter(c => c && c.id && !deletedIds.includes(c.id));
  };

  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';
  if (store && (storage || !migrated)) {
    try {
      const raw = store.getItem(CUSTOMERS_KEY);
      if (!raw) return { customers: [], status: 'ok' };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return { customers: [], status: 'invalid' };
      const customers = filterDeleted(normalizeCustomers(parsed));
      return {
        customers,
        invalidCount: parsed.length - customers.length,
        status: customers.length === parsed.length ? 'ok' : 'partial',
      };
    } catch (error) {
      return { customers: [], status: 'malformed', error };
    }
  }

  // 실 운영 모드 (IndexedDB 비동기 - 계정별 물리 DB 격리 연결)
  return (async () => {
    try {
      const parsed = await getAllCustomers(accountHashKey);
      const customers = filterDeleted(normalizeCustomers(parsed));
      return {
        customers,
        invalidCount: parsed.length - customers.length,
        status: customers.length === parsed.length ? 'ok' : 'partial',
      };
    } catch (error) {
      return { customers: [], status: 'malformed', error };
    }
  })();
};

export const filterCustomersByOwner = (customers, activeEmail = '') => {
  if (!Array.isArray(customers)) return [];
  const normalizedActiveEmail = (activeEmail || '').trim().toLowerCase();
  if (!normalizedActiveEmail) {
    console.log(`[TRACE FILTER] activeEmail이 비어있어 전체 ${customers.length}명 통과 리턴`);
    return customers;
  }

  const filtered = customers.filter(c => {
    const owner = (c.createdByEmail || '').trim().toLowerCase();
    if (!owner) return true;
    return owner === normalizedActiveEmail;
  });

  console.log(`[TRACE FILTER] activeEmail='${normalizedActiveEmail}' 기준: 전체 ${customers.length}명 중 ${filtered.length}명 통과 (필터링된 명단: ${filtered.map(c=>c.name).join(', ')})`);
  return filtered;
};

export const loadCustomers = (storage, activeEmail = '', accountHashKey = null) => {
  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';
  
  const processMigration = (rawCustomers) => {
    if (!Array.isArray(rawCustomers)) return [];
    if (activeEmail) {
      const normalizedEmail = activeEmail.trim().toLowerCase();
      rawCustomers.forEach(c => {
        if (c && !c.createdByEmail) {
          c.createdByEmail = normalizedEmail;
        }
      });
    }
    return filterCustomersByOwner(rawCustomers, activeEmail);
  };

  if (storage || (store && !migrated)) {
    const result = readCustomers(store, accountHashKey);
    console.log(`[TRACE LOAD 동기] storage=${!!storage}, migrated=${migrated} -> ${result.customers.length}명 읽음`);
    return processMigration(result.customers);
  }
  
  return (async () => {
    let rawCustomers = [];
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      try {
        const idbResult = await readCustomers(null, accountHashKey);
        if (Array.isArray(idbResult.customers) && idbResult.customers.length > 0) {
          rawCustomers = idbResult.customers;
          console.log(`[TRACE LOAD IndexedDB 성공] accountHashKey='${accountHashKey}' -> ${rawCustomers.length}명 인양 완료 (${rawCustomers.map(c=>c.name).join(', ')})`);
        }
      } catch (e) {
        console.warn("IndexedDB 조회 폴백:", e);
      }
    }

    if (rawCustomers.length === 0 && store) {
      const lsResult = readCustomers(store, accountHashKey);
      if (Array.isArray(lsResult.customers)) {
        rawCustomers = lsResult.customers;
        console.log(`[TRACE LOAD LocalStorage 폴백] -> ${rawCustomers.length}명 인양 완료 (${rawCustomers.map(c=>c.name).join(', ')})`);
      }
    }
    return processMigration(rawCustomers);
  })();
};

export const saveCustomers = (customers, storage, accountHashKey = null) => {
  if (!Array.isArray(customers)) return false;
  const normalizedCustomers = normalizeCustomers(customers);
  if (normalizedCustomers.length !== customers.length) {
    console.warn(`[TRACE SAVE 경고] 정규화 과정에서 일부 고객 drop (원래 ${customers.length}명 -> 정규화 ${normalizedCustomers.length}명)`);
    return false;
  }

  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );

  if (storage) {
    try {
      storage.setItem(CUSTOMERS_KEY, JSON.stringify(normalizedCustomers));
      console.log(`[TRACE SAVE MockStorage] ${normalizedCustomers.length}명 동기 저장 성공`);
      return true;
    } catch {
      return false;
    }
  }

  return (async () => {
    let ok = false;
    // 1. IndexedDB 비동기 저장
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      try {
        await saveLocalCustomers(normalizedCustomers, accountHashKey);
        console.log(`[TRACE SAVE IndexedDB] accountHashKey='${accountHashKey}' -> 총 ${normalizedCustomers.length}명 비동기 저장 완료! (${normalizedCustomers.map(c=>c.name).join(', ')})`);
        ok = true;
      } catch (error) {
        console.error("IndexedDB 고객 저장 실패:", error);
      }
    }

    // 2. LocalStorage 동시 이중 저장 (어디서 읽든 100% 매칭)
    if (store) {
      try {
        store.setItem(CUSTOMERS_KEY, JSON.stringify(normalizedCustomers));
        console.log(`[TRACE SAVE LocalStorage] 캐시 ${normalizedCustomers.length}명 저장 완료!`);
        ok = true;
      } catch (lsErr) {
        console.warn("LocalStorage 고객 캐시 저장 실패:", lsErr);
      }
    }

    return ok;
  })();
};
