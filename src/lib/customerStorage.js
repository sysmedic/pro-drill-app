import { getAllCustomers, saveLocalCustomers } from './indexedDbConnector.js';
import { normalizeCustomers } from './customerSchema.js';
import { CUSTOMERS_KEY } from './storageKeys.js';

export const readCustomers = (storage, accountHashKey = null) => {
  // 💡 [SSR 격리 대응]: globalThis.localStorage 표준 폴백 대조 (global 에러 방지)
  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';
  if (store && (storage || !migrated)) {
    try {
      const raw = store.getItem(CUSTOMERS_KEY);
      if (!raw) return { customers: [], status: 'ok' };
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return { customers: [], status: 'invalid' };
      const customers = normalizeCustomers(parsed);
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
      const customers = normalizeCustomers(parsed);
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
    return customers;
  }

  return customers.filter(c => {
    const owner = (c.createdByEmail || '').trim().toLowerCase();
    if (!owner) return false;
    return owner === normalizedActiveEmail;
  });
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
    // 로그인된 이메일이 있을 경우, 이메일이 빠져있던 구버전 레코드에 현재 계정 이메일 자동 주입
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

  if (store && (storage || !migrated)) {
    const result = readCustomers(store, accountHashKey);
    return processMigration(result.customers);
  }
  
  return (async () => {
    const result = await readCustomers(null, accountHashKey);
    return processMigration(result.customers);
  })();
};

export const saveCustomers = (customers, storage, accountHashKey = null) => {
  if (!Array.isArray(customers)) return false;
  const normalizedCustomers = normalizeCustomers(customers);
  if (normalizedCustomers.length !== customers.length) return false;

  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';

  if (store && (storage || !migrated)) {
    try {
      store.setItem(CUSTOMERS_KEY, JSON.stringify(normalizedCustomers));
      if (!storage) {
        saveLocalCustomers(normalizedCustomers, accountHashKey).catch(e => console.error(e));
      }
      return true;
    } catch {
      return false;
    }
  }

  return (async () => {
    try {
      await saveLocalCustomers(normalizedCustomers, accountHashKey);
      return true;
    } catch (error) {
      console.error("IndexedDB 고객 저장 실패:", error);
      return false;
    }
  })();
};
