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

const readJsonArray = (storage, key) => {
  const raw = storage?.getItem(key);
  if (raw === null || raw === undefined) return null;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeChartHistory(parsed) : null;
  } catch {
    return null;
  }
};

const writeHistory = (storage, key, history) => {
  if (!storage || !Array.isArray(history)) return false;

  try {
    storage.setItem(key, JSON.stringify(normalizeChartHistory(history)));
    return true;
  } catch {
    return false;
  }
};

const removeKeys = (storage, keys) => {
  for (const key of keys) storage?.removeItem(key);
};

const removeReadableArrayKeys = (storage, keys) => {
  for (const key of keys) {
    if (readJsonArray(storage, key) !== null) storage?.removeItem(key);
  }
};

const findFirstHistory = (storage, keys, predicate = Array.isArray) => {
  for (const key of keys) {
    const history = readJsonArray(storage, key);
    if (predicate(history)) return history;
  }

  return null;
};

const historyKey = (record) => {
  try {
    return JSON.stringify(record);
  } catch {
    return String(record);
  }
};

const mergeHistories = (...histories) => {
  const merged = [];
  const seen = new Set();

  for (const history of histories) {
    if (!Array.isArray(history)) continue;

    for (const record of history) {
      const key = historyKey(record);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(record);
    }
  }

  return merged;
};

const historiesMatch = (first, second) => {
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  return JSON.stringify(first) === JSON.stringify(second);
};

const removeDuplicateOrEmptyLegacyKeys = (storage, keys, primaryHistory) => {
  for (const key of keys) {
    const legacyHistory = readJsonArray(storage, key);
    if (
      legacyHistory !== null && (
        legacyHistory.length === 0 ||
        historiesMatch(legacyHistory, primaryHistory)
      )
    ) {
      storage?.removeItem(key);
    }
  }
};

export const loadChartHistory = (customer, storage = getDefaultStorage()) => {
  if (!storage || !customer) return [];

  const primaryKey = customer.id ? chartHistoryKey(customer.id) : legacyChartHistoryKey(customer.name);
  const primaryHistory = readJsonArray(storage, primaryKey);

  const legacyKeys = [
    customer.name ? legacyChartHistoryKey(customer.name) : null,
    customer.name ? preV7ChartHistoryKey(customer.name) : null,
  ].filter(Boolean);

  if (primaryHistory && primaryHistory.length > 0) return primaryHistory;

  const nonEmptyLegacyHistory = findFirstHistory(storage, legacyKeys, (history) => (
    Array.isArray(history) && history.length > 0
  ));
  if (nonEmptyLegacyHistory) {
    if (customer.id) writeHistory(storage, primaryKey, nonEmptyLegacyHistory);
    return nonEmptyLegacyHistory;
  }

  if (primaryHistory) return primaryHistory;

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
  return writeHistory(storage, key, history) ? key : null;
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

  const legacyHistories = legacyKeys.map((key) => readJsonArray(storage, key)).filter(Array.isArray);
  const history = mergeHistories(currentHistory, ...legacyHistories);
  const shouldWritePrimary = history.length > 0 || currentHistory;
  const didWritePrimary = shouldWritePrimary ? writeHistory(storage, primaryKey, history) : false;

  if (didWritePrimary) removeReadableArrayKeys(storage, legacyKeys);

  return history;
};

export const deleteChartHistory = (customer, storage = getDefaultStorage(), extraNames = []) => {
  if (!storage || !customer) return;

  if (!customer.id) {
    removeKeys(storage, chartHistoryKeysForCustomer(customer, extraNames));
    return;
  }

  const primaryKey = chartHistoryKey(customer.id);
  const primaryHistory = readJsonArray(storage, primaryKey);
  const legacyKeys = chartHistoryKeysForCustomer(customer, extraNames).filter((key) => key !== primaryKey);

  storage.removeItem(primaryKey);
  removeDuplicateOrEmptyLegacyKeys(storage, legacyKeys, primaryHistory);
};
