const normalizePrefix = (prefix) => {
  const normalized = String(prefix || 'id').replace(/[^A-Za-z0-9_-]/g, '_');
  return normalized || 'id';
};

const getCrypto = () => globalThis.crypto;

const createFallbackSuffix = () => {
  const crypto = getCrypto();

  if (crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return `${values[0].toString(36)}_${values[1].toString(36)}`;
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

export const createLocalId = (prefix = 'id') => {
  const idPrefix = normalizePrefix(prefix);
  const uuid = getCrypto()?.randomUUID?.();

  return `${idPrefix}_${uuid || createFallbackSuffix()}`;
};
