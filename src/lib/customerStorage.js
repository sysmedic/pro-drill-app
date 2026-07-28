import { getAllCustomers, saveLocalCustomers } from './indexedDbConnector.js';
import { normalizeCustomers } from './customerSchema.js';
import { CUSTOMERS_KEY } from './storageKeys.js';

export const readCustomers = (storage) => {
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

  // 실 운영 모드 (IndexedDB 비동기)
  return (async () => {
    try {
      const parsed = await getAllCustomers();
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

export const loadCustomers = (storage) => {
  const store = storage || (
    typeof window !== 'undefined' 
      ? window.localStorage 
      : (typeof globalThis !== 'undefined' ? globalThis.localStorage : null)
  );
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem('prodrill_db_migrated_v1') === 'true';
  
  if (store && (storage || !migrated)) {
    const result = readCustomers(store);
    return result.customers;
  }
  
  return (async () => {
    const result = await readCustomers();
    return result.customers;
  })();
};

export const saveCustomers = (customers, storage) => {
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
        saveLocalCustomers(normalizedCustomers).catch(e => console.error(e));
      }
      return true;
    } catch {
      return false;
    }
  }

  return (async () => {
    try {
      await saveLocalCustomers(normalizedCustomers);
      return true;
    } catch (error) {
      console.error("IndexedDB 고객 저장 실패:", error);
      return false;
    }
  })();
};
