import { loadCustomers, saveCustomers, getDeletedCustomerIds } from './customerStorage.js';
import { getChartHistory, saveLocalChartHistory } from './indexedDbConnector.js';
import { uploadBackupData, downloadBackupData, findBackupFile, isGoogleSignedIn, initGoogleApi, getGoogleUserEmail, ensureActiveGoogleToken } from './googleDriveBackup.js';
import { isLicenseCertified, isSyncAllowed } from './userLicenseManager.js';
import { generateSignature, verifyBackupPackage } from './encryption.js';

// 디바운스 타이머 캐시
let debounceTimer = null;

// [안전망] 모든 ProDrillDB IndexedDB 인스턴스에서 고객+차트 데이터 통합 수집
async function collectFromAllProDrillDBs() {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return null;
  try {
    const allDbs = await indexedDB.databases();
    const prodrillDbs = allDbs.filter(d => d.name && d.name.startsWith('ProDrillDB_'));
    if (prodrillDbs.length === 0) return null;

    let bestCustomers = [];
    const allChartHistories = {};

    for (const dbInfo of prodrillDbs) {
      try {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open(dbInfo.name, dbInfo.version);
          req.onsuccess = e => resolve(e.target.result);
          req.onerror = e => reject(e.target.error);
        });

        const customers = await new Promise((res, rej) => {
          const tx = db.transaction('customers', 'readonly');
          const r = tx.objectStore('customers').getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });

        if (customers.length > bestCustomers.length) {
          bestCustomers = customers;
        }

        const chartEntries = await new Promise((res, rej) => {
          const tx = db.transaction('chartHistories', 'readonly');
          const r = tx.objectStore('chartHistories').getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });

        for (const entry of chartEntries) {
          if (entry.customerId && Array.isArray(entry.history) && entry.history.length > 0) {
            const existing = allChartHistories[entry.customerId];
            if (!existing || entry.history.length > existing.length) {
              allChartHistories[entry.customerId] = entry.history;
            }
          }
        }

        db.close();
      } catch (err) {
        console.warn(`[collectFromAllProDrillDBs] DB ${dbInfo.name} 읽기 실패:`, err);
      }
    }

    if (bestCustomers.length > 0) {
      console.warn('[packAppData] 모든 ProDrillDB 순회 폴백 사용 - 고객:', bestCustomers.length);
      return { customers: bestCustomers, chartHistories: allChartHistories };
    }
  } catch (err) {
    console.warn('[collectFromAllProDrillDBs] 실패:', err);
  }
  return null;
}

// 1. 앱 내 모든 데이터 패키징 (IndexedDB -> JSON + 전자서명 + 소유자 격리)
export const packAppData = async (ownerEmailOverride = null) => {
  try {
    let customers = await loadCustomers();

    // [1차 안전망] IndexedDB가 비어있으면 localStorage 'bowling_customers' 폴백
    if ((!Array.isArray(customers) || customers.length === 0) && typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('bowling_customers');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            customers = parsed;
            console.warn('[packAppData] IndexedDB 고객 미스. localStorage 폴백 사용');
          }
        }
      } catch (e) {
        console.warn('[packAppData] localStorage 고객 폴백 읽기 실패:', e);
      }
    }

    let ownerEmail = ownerEmailOverride;
    if (!ownerEmail && isGoogleSignedIn()) {
      try {
        ownerEmail = await getGoogleUserEmail();
      } catch (e) {
        console.warn("구글 사용자 이메일 획득 실패 (서명 제외 구동):", e);
      }
    }

    // [2차 안전망] 여전히 비어있으면 모든 ProDrillDB 인스턴스 순회
    let allDbFallback = null;
    if ((!Array.isArray(customers) || customers.length === 0)) {
      allDbFallback = await collectFromAllProDrillDBs();
      if (allDbFallback && allDbFallback.customers.length > 0) {
        customers = allDbFallback.customers;
      }
    }

    // 소유자 데이터 격리: 타인의 명시적 이메일이 있는 고객만 제외 (guest/빈값은 모두 허용)
    const normalizedOwnerEmail = (ownerEmail || '').trim().toLowerCase();
    const filteredCustomers = customers.filter(c => {
      if (!normalizedOwnerEmail) return true;          // ownerEmail 없으면 전부 허용
      if (!c.createdByEmail) return true;              // createdByEmail 없으면 허용 (레거시/신규 고객)
      const cEmail = c.createdByEmail.trim().toLowerCase();
      if (cEmail === 'guest@prodrill.local') return true; // 오프라인 guest 고객 허용
      return cEmail === normalizedOwnerEmail;
    });

    const chartHistories = {};

    for (const customer of filteredCustomers) {
      if (customer.id) {
        const idbHistory = await getChartHistory(customer.id);
        let history = Array.isArray(idbHistory) ? idbHistory : [];

        // [1차 안전망] IndexedDB 비어있으면 localStorage 폴백
        if (history.length === 0 && typeof window !== 'undefined' && window.localStorage) {
          try {
            const raw = window.localStorage.getItem(`chart_history_v8_${customer.id}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                history = parsed;
                console.warn(`[packAppData] IndexedDB 미스. localStorage 폴백 - 고객: ${customer.name}`);
              }
            }
          } catch (e) {
            console.warn('[packAppData] localStorage 폴백 읽기 실패:', e);
          }
        }

        // [2차 안전망] 모든 ProDrillDB 순회 결과 활용
        if (history.length === 0 && allDbFallback && allDbFallback.chartHistories[customer.id]) {
          history = allDbFallback.chartHistories[customer.id];
          console.warn(`[packAppData] 전체 DB 순회 폴백 - 고객: ${customer.name}`);
        }

        const filteredHistory = history.filter(h => {
          if (!normalizedOwnerEmail) return true;
          if (!h.createdByEmail) return true;
          const hEmail = h.createdByEmail.trim().toLowerCase();
          if (hEmail === 'guest@prodrill.local') return true;
          return hEmail === normalizedOwnerEmail;
        });
        if (filteredHistory.length > 0) {
          chartHistories[customer.id] = filteredHistory;
        }
      }
    }


    let customBowlingBalls = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const rawCustom = window.localStorage.getItem('prodrill_bowling_balls_db_v1');
        if (rawCustom) {
          const parsed = JSON.parse(rawCustom);
          if (Array.isArray(parsed)) customBowlingBalls = parsed;
        }
      } catch (e) {
        console.warn("커스텀 볼링공 백업 읽기 알림:", e);
      }
    }

    const dataPayload = {
      customers: filteredCustomers,
      chartHistories,
      customBowlingBalls
    };

    const signature = generateSignature(dataPayload, ownerEmail);

    return {
      appId: 'ProDrill',
      exportedAt: new Date().toISOString(),
      ownerEmail: ownerEmail || '',
      signature,
      version: 1,
      data: dataPayload
    };
  } catch (error) {
    console.error("데이터 패키징 에러:", error);
    throw error;
  }
};

// 2. 패키지 데이터 로컬 IndexedDB에 언팩 & 지능형 병합 (Merge)
export const unpackAppData = async (payload, mode = 'merge', expectedEmail = null, accountHashKey = null) => {
  if (!payload || payload.appId !== 'ProDrill') {
    throw new Error('INVALID_BACKUP_FORMAT');
  }

  const resolvedAccountHash = accountHashKey || (typeof window !== 'undefined' ? localStorage.getItem('prodrill_certified_email_hash') : null);

  // 🛡️ 소유자 1:1 대조 및 HMAC 위변조 전자서명 검증
  const verification = verifyBackupPackage(payload, expectedEmail);
  if (!verification.valid) {
    if (verification.reason === 'OWNER_MISMATCH') {
      const err = new Error('BACKUP_OWNER_MISMATCH');
      err.ownerEmail = verification.ownerEmail;
      throw err;
    }
    if (verification.reason === 'TAMPERED_DATA') {
      throw new Error('BACKUP_TAMPERED_DATA');
    }
    throw new Error('INVALID_BACKUP_SIGNATURE');
  }

  const { customers: incomingCustomers = [], chartHistories: incomingHistories = {}, customBowlingBalls: incomingCustomBalls = [] } = payload.data || {};

  // 커스텀 입력 볼링공 복원 및 로컬 DB 캐시 병합
  if (Array.isArray(incomingCustomBalls) && incomingCustomBalls.length > 0 && typeof window !== 'undefined' && window.localStorage) {
    try {
      const LOCAL_STORAGE_KEY = 'prodrill_bowling_balls_db_v1';
      const existingRaw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      let existingList = [];
      if (existingRaw) {
        try { existingList = JSON.parse(existingRaw); } catch { /* 무시 */ }
      }
      const map = new Map();
      (Array.isArray(existingList) ? existingList : []).forEach(b => map.set(b.id, b));
      incomingCustomBalls.forEach(b => map.set(b.id, b));
      const mergedList = Array.from(map.values());
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedList));
    } catch (err) {
      console.warn("커스텀 볼링공 복원 병합 실패:", err);
    }
  }

  try {
    if (mode === 'overwrite') {
      // 🟢 [완치 수술]: 덮어쓰기 복원 시 과거 삭제 툼스톤 기록을 100% 초기화하여 누락되는 고객 없이 스냅샷 100% 복원
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('prodrill_deleted_customer_ids');
        } catch { /* 무시 */ }
      }

      // 덮어쓰기 모드: 이름 기반 레거시 캐시 키(chart_history_v7_*, chart_history_이름기반, legacy_chart_*)만 청소
      // [주의] chart_history_v8_* (ID 기반 현행 키)는 절대 삭제하지 않음 - 백업 폴백 데이터 보호
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keysToRemove = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (!k) continue;
            // v8 ID 기반 키는 보호 (새 데이터로 덮어쓰기 전까지 유지)
            if (k.startsWith('chart_history_v8_')) continue;
            // 레거시 이름 기반 키만 청소
            if (k.startsWith('chart_history_') || k.startsWith('legacy_chart_')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => window.localStorage.removeItem(k));
        } catch (e) {
          console.warn("로컬 스토리지 레거시 캐시 청소 실패:", e);
        }
      }

      await saveCustomers(incomingCustomers, null, resolvedAccountHash);
      for (const customerId of Object.keys(incomingHistories)) {
        const historyList = incomingHistories[customerId] || [];
        try {
          await saveLocalChartHistory(customerId, historyList, resolvedAccountHash);
        } catch (err) {
          console.warn("IndexedDB 차트 기록 복원 폴백 무시:", err);
        }
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(`chart_history_v8_${customerId}`, JSON.stringify(historyList));
          } catch (e) {
            console.warn("localStorage 복원 캐시 작성 실패:", e);
          }
        }
      }

      // [핵심] 복원 완료 시각을 현재로 기록 → autoSyncOnLaunch가 구 드라이브 데이터로 덮어쓰는 것 방지
      const restoreNow = new Date().toISOString();
      if (typeof window !== 'undefined') {
        localStorage.setItem('prodrill_last_backup_time', restoreNow);
        localStorage.setItem('prodrill_last_restore_time', restoreNow);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('prodrill_data_restored'));
        window.dispatchEvent(new Event('storage'));
      }
      return true;
    }

    // 병합(Merge) 모드: 고유 ID/이름 대조 및 최종 수정일(updatedAt/createdAt) 비교 세부 병합
    const localCustomers = await loadCustomers(null, expectedEmail || '', resolvedAccountHash);
    const mergedCustomers = [...localCustomers];
    const deletedIds = getDeletedCustomerIds();

    // 2.1 고객 목록 병합 (ID 또는 이름+연락처 매칭)
    for (const incoming of incomingCustomers) {
      if (!incoming || !incoming.id) continue;
      
      // 💡 [완치 수술]: 수동 복원 수신 고객의 경우, 툼스톤(삭제 기록)에 있더라도 수신 데이터의 시각이 유효하면 툼스톤을 해제하고 정상 복구 인양
      if (deletedIds.includes(incoming.id)) {
        const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
        if (incomingTime === 0) {
          console.log(`👻 [고스트 차단] 삭제 툼스톤 감지 -> 무유효 타임스탬프 유령 고객 '${incoming.name}'(${incoming.id}) 부활 스킵!`);
          continue;
        }
      }

      const localIdx = mergedCustomers.findIndex(c => c.id === incoming.id || (c.name && incoming.name && c.name === incoming.name && c.phone === incoming.phone));
      if (localIdx === -1) {
        // 로컬에 없는 신규 고객 -> 추가
        mergedCustomers.push(incoming);
      } else {
        // 동일 고객 -> updatedAt 시각 비교 (Local-First Guard: 들어온 수치가 더 최신일 때만 덮어씀)
        const localTime = mergedCustomers[localIdx].updatedAt ? new Date(mergedCustomers[localIdx].updatedAt).getTime() : 0;
        const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
        if (incomingTime > localTime || (localTime === 0 && incomingTime > 0)) {
          mergedCustomers[localIdx] = incoming;
        }
      }
    }
    await saveCustomers(mergedCustomers, null, resolvedAccountHash);

    // 2.2 개별 지공 차트 기록 레코드 단위 병합 (ID 또는 차트명/볼이름 대조)
    for (const customerId of Object.keys(incomingHistories)) {
      const incomingList = incomingHistories[customerId] || [];
      const localList = await getChartHistory(customerId, resolvedAccountHash);
      const mergedList = [...localList];

      for (const incomingRecord of incomingList) {
        // 개별 차트 레코드 고유 ID 또는 차트명 기반 대조
        const localRecIdx = mergedList.findIndex(r => {
          if (incomingRecord.id && r.id) return r.id === incomingRecord.id;
          if (incomingRecord.name && r.name) return r.name === incomingRecord.name;
          return false;
        });

        if (localRecIdx === -1) {
          // 신규 차트 레코드 -> 병합 목록에 추가
          mergedList.push(incomingRecord);
        } else {
          // 동일한 차트 레코드 -> 최종 수정일 시각 보장 (updatedAt -> createdAt -> timestamp)
          const getRecTime = (rec) => {
            if (rec.updatedAt) return new Date(rec.updatedAt).getTime();
            if (rec.createdAt) return new Date(rec.createdAt).getTime();
            if (rec.timestamp) return new Date(rec.timestamp).getTime();
            return 0;
          };

          const localRecTime = getRecTime(mergedList[localRecIdx]);
          const incomingRecTime = getRecTime(incomingRecord);

          if (incomingRecTime >= localRecTime || localRecTime === 0) {
            mergedList[localRecIdx] = incomingRecord;
          }
        }
      }

      // 최신 등록순 정렬하여 저장
      mergedList.sort((a, b) => {
        const getRecTime = (rec) => {
          if (rec.createdAt) return new Date(rec.createdAt).getTime();
          if (rec.timestamp) return new Date(rec.timestamp).getTime();
          if (rec.updatedAt) return new Date(rec.updatedAt).getTime();
          return 0;
        };
        return getRecTime(b) - getRecTime(a);
      });

      await saveLocalChartHistory(customerId, mergedList, resolvedAccountHash);

      // 🌟 [핵심 수정을 통한 이중 동기화]: localStorage 캐시 키도 함께 갱신하여 loadChartHistory 동기 조회 시 최신 데이터 보장
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(`chart_history_v8_${customerId}`, JSON.stringify(mergedList));
        } catch (e) {
          console.warn("localStorage 복원 캐시 작성 실패:", e);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('prodrill_data_restored'));
      window.dispatchEvent(new Event('storage'));
    }

    return true;
  } catch (error) {
    console.error("데이터 병합 에러:", error);
    throw error;
  }
};

// 3. 구글 드라이브로 백업 실행
export const performBackup = async () => {
  if (!isSyncAllowed()) {
    throw new Error('LICENSE_NOT_CERTIFIED');
  }

  // 🛡️ [안전장치]: 앱 세션 계정과 구글 연동 계정이 다르면 백업 차단
  const activeAppEmail = localStorage.getItem('prodrill_active_user_email') || '';
  if (isGoogleSignedIn()) {
    try {
      const googleEmail = await getGoogleUserEmail();
      if (activeAppEmail && googleEmail && activeAppEmail.toLowerCase() !== googleEmail.toLowerCase()) {
        throw new Error('ACCOUNT_MISMATCH');
      }
    } catch (err) {
      if (err.message === 'ACCOUNT_MISMATCH') throw err;
    }
  }

  try {
    const payload = await packAppData();
    await uploadBackupData(payload);
    
    // 로컬에 마지막 백업 성공 타임스탬프 기록
    localStorage.setItem('prodrill_last_backup_time', payload.exportedAt);
    return payload.exportedAt;
  } catch (error) {
    console.error("구글 드라이브 백업 업로드 에러:", error);
    throw error;
  }
};

// 4. 구글 드라이브로부터 복원(가져오기) 실행 (특정 백업 스냅샷 ID 지정 지원)
export const performRestore = async (fileId = null, mode = 'merge') => {
  if (!isSyncAllowed()) {
    throw new Error('LICENSE_NOT_CERTIFIED');
  }
  try {
    let currentEmail = null;
    if (isGoogleSignedIn()) {
      try {
        currentEmail = await getGoogleUserEmail();
      } catch (e) {
        console.warn("구글 사용자 이메일 획득 실패:", e);
      }
    }

    let targetFileId = null;
    let targetMode = 'merge';

    if (typeof fileId === 'string' && (fileId === 'merge' || fileId === 'overwrite')) {
      targetMode = fileId;
      targetFileId = null;
    } else {
      if (typeof fileId === 'string' && fileId.trim()) {
        targetFileId = fileId.trim();
      }
      if (mode === 'overwrite' || mode === 'merge') {
        targetMode = mode;
      }
    }

    const payload = await downloadBackupData(targetFileId);
    await unpackAppData(payload, targetMode, currentEmail);
    
    if (payload.exportedAt) {
      localStorage.setItem('prodrill_last_backup_time', payload.exportedAt);
    }
    return true;
  } catch (error) {
    console.error("구글 드라이브 복원 다운로드 에러:", error);
    throw error;
  }
};

// 5. 실행 시 자동 동기화 로직 (Auto Sync on Launch)
export const autoSyncOnLaunch = async (setFeedback) => {
  // 🟢 [네트워크 오프라인 상태 감지]: 인터넷 미연결 시 로컬 안전 보존 문구를 띄우고 즉시 종료
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (setFeedback) {
      setFeedback({ 
        message: '[오프라인] 네트워크 연결이 해제되었습니다. 데이터는 로컬 기기(오프라인)에 안전하게 보존됩니다.', 
        tone: 'warning' 
      });
    }
    return;
  }

  // 사용자가 명시적으로 로그아웃했거나, 자동 동기화를 껐거나, 동기화 권한이 없다면 스킵
  const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('prodrill_user_logged_out') === 'true';
  const autoSyncEnabled = localStorage.getItem('prodrill_auto_sync_enabled') !== 'false';
  if (isLoggedOut || !autoSyncEnabled || !isSyncAllowed()) return;

  try {
    await initGoogleApi();
    const hasToken = await ensureActiveGoogleToken();
    if (!hasToken && !isGoogleSignedIn()) {
      return;
    }

    const backupFile = await findBackupFile();
    if (!backupFile) {
      // 클라우드에 백업이 없다면, 즉시 최초 백업을 기동해 줌
      console.log("☁️ [자동 동기화] 클라우드 백업 미존재. 최초 백업본 자동 생성 중...");
      await performBackup();
      return;
    }

    // [복원 직후 보호]: 방금 복원한 경우(30초 이내) autoSync의 자동 merge 스킵 → 복원 데이터 보호
    const lastRestoreRaw = localStorage.getItem('prodrill_last_restore_time');
    if (lastRestoreRaw) {
      const restoreAge = new Date().getTime() - new Date(lastRestoreRaw).getTime();
      if (restoreAge < 30000) {
        console.log('☁️ [자동 동기화] 복원 직후 30초 보호 구간. 자동 merge 스킵.');
        return;
      }
    }

    // 🟢 [앱 실행 시 클라우드 복원 확립]: 클라우드 백업이 존재하고 토큰이 유효한 경우, 무조건 클라우드의 최신 지공 차트 및 고객 데이터를 안전 1:1 증분 병합(merge) 복원 수행
    console.log("☁️ [자동 동기화] 구글 드라이브 백업 발견. 타임스탬프 기반 안전 자동 복원(merge) 실행 중...");
    if (setFeedback) setFeedback({ message: '☁️ 구글 드라이브에서 최신 지공 차트 및 고객 데이터를 자동으로 복원 중...', tone: 'info' });
    await performRestore(backupFile.id, 'merge');
    if (setFeedback) setFeedback({ message: '☁️ 구글 드라이브 클라우드 복원 동기화 완료!', tone: 'success' });
  } catch (error) {
    // 구글 API 환경변수 미설정 혹은 견본 상태 시 조용히 로컬 모드로 구동 처리
    if (error && (error.message === 'GOOGLE_API_KEYS_MISSING' || error.message === 'GOOGLE_SDK_NOT_LOADED')) {
      console.log("☁️ [구글 동기화]: 구글 API 환경변수가 설정되지 않았거나 견본 상태이므로 클라우드 연동을 제외한 로컬 전용 모드로만 구동합니다.");
      return;
    }

    console.error("앱 실행 시 자동 동기화 실패:", error);

    // 구글 API 에러 원인 상세 파싱
    let errorMsg;
    let errorCode;

    if (error && error.result && error.result.error) {
      errorMsg = error.result.error.message;
      errorCode = error.result.error.code;
    } else if (error && error.error) {
      errorMsg = error.error.message;
      errorCode = error.error.code;
    } else {
      errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    }

    console.warn(`☁️ [자동 동기화 실패 사유]: (코드 ${errorCode || '알 수 없음'}) - ${errorMsg}`);

    // 만약 401(인증 만료) 또는 403(권한 없음) 오류가 발생했다면 만료된 액세스 토큰만 비우고 연동 이메일 정보는 보존
    if (errorCode === 401 || errorCode === 403 || errorMsg.includes('auth') || errorMsg.includes('credential')) {
      console.warn("🔐 [자동 동기화] 구글 인증 토큰 만료 감지. 연동 이메일 정보는 보존하며 만료된 토큰만 초기화합니다.");
      if (typeof window !== 'undefined') {
        localStorage.removeItem('prodrill_google_access_token');
        localStorage.removeItem('prodrill_google_token_expiry');
      }
    }
  }
};

// 6. 데이터 변경 발생 시 자동 백그라운드 백업 (Debounced Auto Save)
export const autoSyncOnChange = () => {
  const autoSyncEnabled = localStorage.getItem('prodrill_auto_sync_enabled') !== 'false';
  if (!autoSyncEnabled || !isSyncAllowed() || !isGoogleSignedIn() || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  // 3초 디바운스를 적용하여 작업 도중 키입력마다 호출되는 네트워크 낭비 차단
  debounceTimer = setTimeout(async () => {
    try {
      console.log("☁️ [자동 백업] 데이터 변경 감지. 백그라운드 백업 시작...");
      await performBackup();
      console.log("☁️ [자동 백업] 백그라운드 백업 업로드 완료!");
    } catch (e) {
      console.error("백그라운드 자동 백업 실패:", e);
    }
  }, 3000);
};

// 7. Visibility API 및 브라우저 종료 시점(pagehide/beforeunload) 감지 동기화 등록
export const registerVisibilitySync = () => {
  if (typeof window === 'undefined') return;

  const handleFinalSync = async () => {
    const autoSyncEnabled = localStorage.getItem('prodrill_auto_sync_enabled') !== 'false';
    if (!autoSyncEnabled || !isLicenseCertified() || !isGoogleSignedIn() || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

    // 대기 중인 디바운스가 있다면 즉시 취소 후 다이렉트로 실행
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    try {
      console.log("☁️ [자동 백업] 화면 이탈/종료 감지. 최종 동기화 업로드 중...");
      await performBackup();
    } catch (e) {
      console.error("이탈 시 자동 백업 실패:", e);
    }
  };

  const handleMobileAppResume = async () => {
    try {
      await initGoogleApi();
      await autoSyncOnLaunch();
    } catch { /* ignore */ }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handleFinalSync();
    } else if (document.visibilityState === 'visible') {
      handleMobileAppResume();
    }
  };

  // 🟢 [모바일 & PWA 융합 완치]: Safari/Android PWA 특화 4종 라이프사이클 이벤트 바인딩
  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handleMobileAppResume);
  window.addEventListener('focus', handleMobileAppResume);
  window.addEventListener('online', handleMobileAppResume);
  window.addEventListener('pagehide', handleFinalSync);
  window.addEventListener('beforeunload', handleFinalSync);

  return () => {
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pageshow', handleMobileAppResume);
    window.removeEventListener('focus', handleMobileAppResume);
    window.removeEventListener('online', handleMobileAppResume);
    window.removeEventListener('pagehide', handleFinalSync);
    window.removeEventListener('beforeunload', handleFinalSync);
  };
};

// 6. 데이터 변경 시 3초 디바운스 자동 백업 트리거
export const triggerAutoBackup = (delayMs = 3000) => {
  const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('prodrill_user_logged_out') === 'true';
  const autoSyncEnabled = typeof window !== 'undefined' && localStorage.getItem('prodrill_auto_sync_enabled') !== 'false';
  if (isLoggedOut || !autoSyncEnabled || !isSyncAllowed()) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      if (isGoogleSignedIn()) {
        console.log("☁️ [실시간 자동 백업] 데이터 변경 감지. 구글 드라이브 백업 전송 중...");
        await performBackup();
        console.log("☁️ [실시간 자동 백업] 백업 완료!");
      }
    } catch (err) {
      console.warn("☁️ [실시간 자동 백업] 백업 알림:", err);
    }
  }, delayMs);
};
