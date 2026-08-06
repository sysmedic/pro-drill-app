import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const storageData = new Map();

const installStorageMock = (initial = {}) => {
  storageData.clear();
  for (const [key, value] of Object.entries(initial)) {
    storageData.set(key, value);
  }

  globalThis.localStorage = {
    getItem: (key) => storageData.has(key) ? storageData.get(key) : null,
    setItem: (key, value) => storageData.set(key, String(value)),
    removeItem: (key) => storageData.delete(key),
    clear: () => storageData.clear(),
  };

  if (!globalThis.crypto) {
    globalThis.crypto = {
      subtle: {
        digest: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      },
    };
  }
};

const withViteModule = async (modulePath, callback) => {
  const server = await createServer({
    appType: 'custom',
    configFile: 'vite.config.js',
    logLevel: 'silent',
    mode: 'test',
    server: { middlewareMode: true },
  });

  try {
    const module = await server.ssrLoadModule(modulePath);
    return await callback(module);
  } finally {
    await server.close();
  }
};

test('site shell renders the customer manager with saved customers', async () => {
  installStorageMock({
    prodrill_active_user_email: 'smoke@test.com',
    prodrill_certified_user_email: 'smoke@test.com',
    prodrill_google_user_email: 'smoke@test.com',
    prodrill_google_access_token: 'mock_token',
    bowling_customers: JSON.stringify([
      {
        id: 'cus_smoke_1',
        name: '테스트 고객',
        phone: '010-1234-5678',
        hand: '왼손',
        style: '투핸드',
      },
    ]),
  });

  await withViteModule('/src/pages/customerManager/CustomerHeader.jsx', ({ default: CustomerHeader }) => {
    const html = renderToString(React.createElement(CustomerHeader, {
      customerCount: 1,
      searchTerm: '',
      onSearchChange: () => {},
      onOpenAddModal: () => {},
      onLogout: () => {},
      userTier: 'master'
    }));
    assert.match(html, /고객/);
  });
});

test('chart detail renders for a left-handed thumbless customer', async () => {
  installStorageMock();

  await withViteModule('/src/pages/ChartDetail.jsx', ({ default: ChartDetail }) => {
    const html = renderToString(React.createElement(ChartDetail, {
      customer: {
        id: 'cus_smoke_2',
        name: '좌완 고객',
        hand: '왼손',
        style: '덤리스',
      },
      onBack: () => {},
    }));

    assert.match(html, /좌완 고객/);
    assert.match(html, /왼손/);
    assert.match(html, /작업내용/);
  });
});
