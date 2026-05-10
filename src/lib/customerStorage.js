import { CUSTOMERS_KEY } from './storageKeys.js';

const getDefaultStorage = () => {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
};

export const readCustomers = (storage = getDefaultStorage()) => {
  if (!storage) {
    return { customers: [], status: 'unavailable' };
  }

  const raw = storage.getItem(CUSTOMERS_KEY);
  if (raw === null || raw === undefined) {
    return { customers: [], status: 'missing' };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { customers: [], status: 'invalid' };
    }

    return { customers: parsed, status: 'ok' };
  } catch (error) {
    return { customers: [], status: 'malformed', error };
  }
};

export const loadCustomers = (storage = getDefaultStorage()) => readCustomers(storage).customers;

export const saveCustomers = (customers, storage = getDefaultStorage()) => {
  if (!storage || !Array.isArray(customers)) return false;

  try {
    storage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
    return true;
  } catch {
    return false;
  }
};
