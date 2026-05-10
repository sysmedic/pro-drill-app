import {
  chartHistoryKey,
  chartHistoryKeysForCustomer,
  legacyChartHistoryKey,
  preV7ChartHistoryKey,
} from './storageKeys.js';

const getDefaultStorage = () => {
  if (typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
};

const readJsonArray = (storage, key) => {
  const raw = storage?.getItem(key);
  if (raw === null || raw === undefined) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeHistory = (storage, key, history) => {
  storage?.setItem(key, JSON.stringify(Array.isArray(history) ? history : []));
};

const removeKeys = (storage, keys) => {
  for (const key of keys) storage?.removeItem(key);
};

export const loadChartHistory = (customer, storage = getDefaultStorage()) => {
  if (!storage || !customer) return [];

  const primaryKey = customer.id ? chartHistoryKey(customer.id) : legacyChartHistoryKey(customer.name);
  const primaryHistory = readJsonArray(storage, primaryKey);
  if (primaryHistory) return primaryHistory;

  const legacyKeys = [
    customer.name ? legacyChartHistoryKey(customer.name) : null,
    customer.name ? preV7ChartHistoryKey(customer.name) : null,
  ].filter(Boolean);

  for (const key of legacyKeys) {
    const legacyHistory = readJsonArray(storage, key);
    if (!legacyHistory) continue;
    if (customer.id) writeHistory(storage, primaryKey, legacyHistory);
    return legacyHistory;
  }

  return [];
};

export const saveChartHistory = (customer, history, storage = getDefaultStorage()) => {
  if (!storage || !customer) return null;

  const key = customer.id ? chartHistoryKey(customer.id) : legacyChartHistoryKey(customer.name);
  writeHistory(storage, key, history);
  return key;
};

export const renameChartHistory = ({ id, oldName, newName }, storage = getDefaultStorage()) => {
  if (!storage) return [];

  const customer = { id, name: newName || oldName };
  const primaryKey = id ? chartHistoryKey(id) : legacyChartHistoryKey(customer.name);
  const currentHistory = readJsonArray(storage, primaryKey);

  const legacyKeys = [
    oldName ? legacyChartHistoryKey(oldName) : null,
    oldName ? preV7ChartHistoryKey(oldName) : null,
    newName ? legacyChartHistoryKey(newName) : null,
    newName ? preV7ChartHistoryKey(newName) : null,
  ].filter(Boolean);

  const history = currentHistory || legacyKeys.map((key) => readJsonArray(storage, key)).find(Boolean) || [];
  if (history.length > 0 || currentHistory) writeHistory(storage, primaryKey, history);
  removeKeys(storage, legacyKeys);

  return history;
};

export const deleteChartHistory = (customer, storage = getDefaultStorage(), extraNames = []) => {
  if (!storage || !customer) return;
  removeKeys(storage, chartHistoryKeysForCustomer(customer, extraNames));
};
