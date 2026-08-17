const DB_VERSION = 1;

// 계정별 DB 인스턴스 캐시 맵
const dbInstancesMap = {};

export const getDB = (accountHashKeyOverride = null) => {
  let accountHashKey = accountHashKeyOverride;
  if (!accountHashKey && typeof window !== 'undefined') {
    accountHashKey = localStorage.getItem('prodrill_certified_email_hash') || 'default';
  }
  const cleanKey = (accountHashKey || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDbName = `ProDrillDB_${cleanKey}`;

  if (dbInstancesMap[targetDbName]) {
    return Promise.resolve(dbInstancesMap[targetDbName]);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(targetDbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('customers')) {
        db.createObjectStore('customers', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chartHistories')) {
        db.createObjectStore('chartHistories', { keyPath: 'customerId' });
      }
    };

    request.onsuccess = async (event) => {
      const instance = event.target.result;
      dbInstancesMap[targetDbName] = instance;
      
      // 🌟 [품질 향상]: 기존 localStorage 레거시 데이터가 있다면 IndexedDB로 자동 마이그레이션
      try {
        await migrateLocalStorageToIndexedDB(instance);
      } catch (err) {
        console.error("레거시 localStorage 마이그레이션 실패:", err);
      }

      // 🔄 [계정 해시 변경 감지]: 이전과 다른 DB 키라면 기존 DB 데이터를 새 DB로 자동 복사
      if (typeof window !== 'undefined') {
        try {
          const lastDbKey = localStorage.getItem('prodrill_last_db_key');
          if (lastDbKey && lastDbKey !== cleanKey && lastDbKey !== 'default') {
            const prevDbName = `ProDrillDB_${lastDbKey}`;
            await migrateAcrossDbInstances(prevDbName, instance);
          }
          localStorage.setItem('prodrill_last_db_key', cleanKey);
        } catch (err) {
          console.warn("DB 인스턴스 간 마이그레이션 실패:", err);
        }
      }
      
      resolve(instance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};


// 마이그레이션 헬퍼 함수
async function migrateLocalStorageToIndexedDB() {
  if (typeof window === 'undefined') return;
  const migratedFlag = localStorage.getItem('prodrill_db_migrated_v1');
  if (migratedFlag === 'true') return; // 이미 완료됨

  const localCustomersRaw = localStorage.getItem('bowling_customers');
  if (!localCustomersRaw) {
    // 마이그레이션할 레거시 데이터가 없으므로 플래그만 세움
    localStorage.setItem('prodrill_db_migrated_v1', 'true');
    return;
  }

  let customers;
  try {
    customers = JSON.parse(localCustomersRaw);
  } catch (e) {
    console.error("레거시 고객 데이터 파싱 실패:", e);
    return;
  }

  if (!Array.isArray(customers) || customers.length === 0) {
    localStorage.setItem('prodrill_db_migrated_v1', 'true');
    return;
  }

  console.log(`📦 [마이그레이션] 레거시 고객 ${customers.length}명 감지. IndexedDB 이주 개시...`);

  // 1. 고객 데이터 이주
  await saveLocalCustomers(customers);

  // 2. 고객별 차트 히스토리 이주
  for (const customer of customers) {
    if (!customer.id) continue;
    const historyKey = `chart_history_v8_${customer.id}`;
    const legacyHistoryRaw = localStorage.getItem(historyKey);
    
    if (legacyHistoryRaw) {
      try {
        const history = JSON.parse(legacyHistoryRaw);
        if (Array.isArray(history) && history.length > 0) {
          await saveLocalChartHistory(customer.id, history);
          console.log(`└─ [이주 완료] 고객(${customer.name}) 지공 기록 ${history.length}건`);
        }
      } catch (e) {
        console.error(`고객(${customer.name}) 기록 이주 에러:`, e);
      }
    }
  }

  // 성공 플래그 등록 (레거시 localStorage 데이터는 안전을 위해 강제로 지우지 않고 그대로 둡니다.)
  localStorage.setItem('prodrill_db_migrated_v1', 'true');
  console.log("🎉 [마이그레이션] IndexedDB 로컬 이주 성공 완료!");
}

// 🔄 DB 인스턴스 간 데이터 복사 (계정 해시 변경 시 구 DB → 신 DB 자동 이전)
async function migrateAcrossDbInstances(prevDbName, newDbInstance) {
  return new Promise((resolve) => {
    const req = indexedDB.open(prevDbName, DB_VERSION);
    req.onsuccess = async (event) => {
      const prevDb = event.target.result;
      try {
        // 1. 구 DB에서 고객 목록 읽기
        const customers = await new Promise((res, rej) => {
          const tx = prevDb.transaction('customers', 'readonly');
          const st = tx.objectStore('customers');
          const r = st.getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });

        // 2. 구 DB에서 차트 히스토리 읽기
        const chartHistories = await new Promise((res, rej) => {
          const tx = prevDb.transaction('chartHistories', 'readonly');
          const st = tx.objectStore('chartHistories');
          const r = st.getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });

        prevDb.close();

        // 3. 신 DB에 복사 (기존 데이터가 없을 때만)
        const newCustomers = await new Promise((res, rej) => {
          const tx = newDbInstance.transaction('customers', 'readonly');
          const st = tx.objectStore('customers');
          const r = st.getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });

        if (newCustomers.length === 0 && customers.length > 0) {
          await new Promise((res, rej) => {
            const tx = newDbInstance.transaction('customers', 'readwrite');
            const st = tx.objectStore('customers');
            let count = 0;
            if (customers.length === 0) { res(true); return; }
            for (const c of customers) {
              const r = st.put(c);
              r.onsuccess = () => { if (++count === customers.length) res(true); };
              r.onerror = () => rej(r.error);
            }
          });

          for (const entry of chartHistories) {
            await new Promise((res) => {
              const tx = newDbInstance.transaction('chartHistories', 'readwrite');
              const st = tx.objectStore('chartHistories');
              const r = st.put(entry);
              r.onsuccess = () => res(true);
              r.onerror = () => res(false);
            });
          }
          console.log(`🔄 [DB 이전] ${prevDbName} → 신 DB 이전 완료 (고객 ${customers.length}명, 차트 ${chartHistories.length}건)`);
        }
      } catch (err) {
        console.warn("DB 간 이전 중 오류:", err);
        try { prevDb.close(); } catch (closeErr) { console.warn('prevDb.close 실패:', closeErr); }
      }
      resolve();
    };
    req.onerror = () => resolve(); // 구 DB 없으면 조용히 통과
  });
}

// CRUD Helpers
export const getAllCustomers = async (accountHashKey = null) => {
  const db = await getDB(accountHashKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('customers', 'readonly');
    const store = transaction.objectStore('customers');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveLocalCustomers = async (customers, accountHashKey = null) => {
  const db = await getDB(accountHashKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('customers', 'readwrite');
    const store = transaction.objectStore('customers');

    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      if (customers.length === 0) {
        resolve(true);
        return;
      }
      let count = 0;
      let hasError = false;
      for (const customer of customers) {
        const putReq = store.put(customer);
        putReq.onsuccess = () => {
          count++;
          if (count === customers.length && !hasError) {
            resolve(true);
          }
        };
        putReq.onerror = () => {
          hasError = true;
          reject(putReq.error);
        };
      }
    };
    clearReq.onerror = () => reject(clearReq.error);
  });
};

export const getChartHistory = async (customerId, accountHashKey = null) => {
  if (!customerId) return [];
  const db = await getDB(accountHashKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chartHistories', 'readonly');
    const store = transaction.objectStore('chartHistories');
    const request = store.get(customerId);

    request.onsuccess = () => {
      resolve(request.result ? request.result.history : []);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveLocalChartHistory = async (customerId, history, accountHashKey = null) => {
  if (!customerId) return false;
  try {
    const db = await getDB(accountHashKey);
    return await new Promise((resolve) => {
      const transaction = db.transaction('chartHistories', 'readwrite');
      const store = transaction.objectStore('chartHistories');
      const request = store.put({ customerId, history });

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => {
        console.warn("IndexedDB 차트 기록 저장 실패 폴백:", e);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn("IndexedDB 차트 기록 접근 에러 무시:", err);
    return false;
  }
};

export const deleteLocalChartHistory = async (customerId, accountHashKey = null) => {
  if (!customerId) return false;
  const db = await getDB(accountHashKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chartHistories', 'readwrite');
    const store = transaction.objectStore('chartHistories');
    const request = store.delete(customerId);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const getChartsCount = async (accountHashKey = null) => {
  const db = await getDB(accountHashKey);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('chartHistories', 'readonly');
    const store = transaction.objectStore('chartHistories');
    const request = store.getAll();

    request.onsuccess = () => {
      const list = request.result || [];
      const total = list.reduce((acc, curr) => acc + (curr.history ? curr.history.length : 0), 0);
      resolve(total);
    };
    request.onerror = () => reject(request.error);
  });
};

// globalThis에 캐시 측정을 위해 등록 (useAppSession 및 기타 파일에서 확인 용이)
if (typeof window !== 'undefined') {
  window.indexedDbHelper = {
    getChartsCount,
    getAllCustomers,
    saveLocalCustomers,
    getChartHistory,
    saveLocalChartHistory,
    deleteLocalChartHistory
  };
}
