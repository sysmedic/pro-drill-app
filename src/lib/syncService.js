import { loadCustomers, saveCustomers } from './customerStorage.js';
import { getChartHistory, saveLocalChartHistory } from './indexedDbConnector.js';
import { uploadBackupData, downloadBackupData, findBackupFile, isGoogleSignedIn, initGoogleApi, getGoogleUserEmail } from './googleDriveBackup.js';
import { isLicenseCertified, isSyncAllowed } from './userLicenseManager.js';
import { generateSignature, verifyBackupPackage } from './encryption.js';

// 디바운스 타이머 캐시
let debounceTimer = null;

// 1. 앱 내 모든 데이터 패키징 (IndexedDB -> JSON + 전자서명 + 소유자 격리)
export const packAppData = async (ownerEmailOverride = null) => {
  try {
    const customers = await loadCustomers();
    const chartHistories = {};

    let ownerEmail = ownerEmailOverride;
    if (!ownerEmail && isGoogleSignedIn()) {
      try {
        ownerEmail = await getGoogleUserEmail();
      } catch (e) {
        console.warn("구글 사용자 이메일 획득 실패 (서명 제외 구동):", e);
      }
    }

    // 🛡️ 소유자 데이터 격리: 타인의 createdByEmail이 명시된 차트는 백업 수집 대상에서 완전히 제외
    const normalizedOwnerEmail = (ownerEmail || '').trim().toLowerCase();
    const filteredCustomers = customers.filter(c => {
      if (!c.createdByEmail || !normalizedOwnerEmail) return true;
      return c.createdByEmail.trim().toLowerCase() === normalizedOwnerEmail;
    });

    for (const customer of filteredCustomers) {
      if (customer.id) {
        const history = await getChartHistory(customer.id);
        if (Array.isArray(history) && history.length > 0) {
          const filteredHistory = history.filter(h => {
            if (!h.createdByEmail || !normalizedOwnerEmail) return true;
            return h.createdByEmail.trim().toLowerCase() === normalizedOwnerEmail;
          });
          if (filteredHistory.length > 0) {
            chartHistories[customer.id] = filteredHistory;
          }
        }
      }
    }

    const dataPayload = {
      customers: filteredCustomers,
      chartHistories
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
export const unpackAppData = async (payload, mode = 'merge', expectedEmail = null) => {
  if (!payload || payload.appId !== 'ProDrill') {
    throw new Error('INVALID_BACKUP_FORMAT');
  }

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

  const { customers: incomingCustomers = [], chartHistories: incomingHistories = {} } = payload.data || {};

  try {
    if (mode === 'overwrite') {
      // 덮어쓰기 모드: 기존 로컬 데이터를 완전히 지우고 들어온 데이터로 대체
      await saveCustomers(incomingCustomers);
      for (const customerId of Object.keys(incomingHistories)) {
        await saveLocalChartHistory(customerId, incomingHistories[customerId]);
      }
      return true;
    }

    // 병합(Merge) 모드: 고유 ID 기반 타임스탬프 비교 병합
    const localCustomers = await loadCustomers();
    const mergedCustomers = [...localCustomers];

    // 2.1 고객 목록 병합
    for (const incoming of incomingCustomers) {
      const localIdx = mergedCustomers.findIndex(c => c.id === incoming.id);
      if (localIdx === -1) {
        // 기존 로컬에 없는 신규 고객 -> 추가
        mergedCustomers.push(incoming);
      } else {
        // 동일 고객 -> updatedAt 시간 비교 후 더 최신본으로 덮어씀
        const localTime = new Date(mergedCustomers[localIdx].updatedAt || 0).getTime();
        const incomingTime = new Date(incoming.updatedAt || 0).getTime();
        if (incomingTime > localTime) {
          mergedCustomers[localIdx] = incoming;
        }
      }
    }
    await saveCustomers(mergedCustomers);

    // 2.2 지공 기록 히스토리 병합
    for (const customerId of Object.keys(incomingHistories)) {
      const incomingList = incomingHistories[customerId] || [];
      const localList = await getChartHistory(customerId);
      const mergedList = [...localList];

      for (const incomingRecord of incomingList) {
        const localRecIdx = mergedList.findIndex(r => r.id === incomingRecord.id);
        if (localRecIdx === -1) {
          mergedList.push(incomingRecord);
        } else {
          const localRecTime = new Date(mergedList[localRecIdx].updatedAt || 0).getTime();
          const incomingRecTime = new Date(incomingRecord.updatedAt || 0).getTime();
          if (incomingRecTime > localRecTime) {
            mergedList[localRecIdx] = incomingRecord;
          }
        }
      }

      // 최신 등록순 정렬하여 저장
      mergedList.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      await saveLocalChartHistory(customerId, mergedList);
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

// 4. 구글 드라이브로부터 복원(가져오기) 실행
export const performRestore = async (mode = 'merge') => {
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

    const payload = await downloadBackupData();
    await unpackAppData(payload, mode, currentEmail);
    
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
    if (!isGoogleSignedIn()) {
      // 자동 로그인이 안 되어 있으면 즉각적인 사용자 팝업을 띄우지 않고 자연스레 스킵 (불안한 팝업 방지)
      return;
    }

    const backupFile = await findBackupFile();
    if (!backupFile) {
      // 클라우드에 백업이 없다면, 즉시 최초 백업을 기동해 줌
      console.log("☁️ [자동 동기화] 클라우드 백업 미존재. 최초 백업본 자동 생성 중...");
      await performBackup();
      return;
    }

    // 최종 동기화 시간 비교
    const driveTimeRaw = backupFile.modifiedTime; // 구글 드라이브 파일 수정시간
    const localTimeRaw = localStorage.getItem('prodrill_last_backup_time');

    if (!localTimeRaw) {
      // 로컬에 마지막 동기화 기록이 없다면 무조건 다운로드 후 병합
      console.log("☁️ [자동 동기화] 로컬 동기화 기록 미존재. 클라우드 백업 자동 인양 중...");
      if (setFeedback) setFeedback({ message: '☁️ 구글 드라이브에서 백업 데이터를 자동으로 동기화합니다...', tone: 'info' });
      await performRestore('merge');
      if (setFeedback) setFeedback({ message: '☁️ 구글 드라이브 백업 데이터 동기화 완료!', tone: 'success' });
      return;
    }

    const driveTime = new Date(driveTimeRaw).getTime();
    const localTime = new Date(localTimeRaw).getTime();

    // 10초 이내 미세 차이는 오차 범위로 보고 동기화 생략 (무한 동기화 루프 방지)
    if (Math.abs(driveTime - localTime) < 10000) {
      return;
    }

    if (driveTime > localTime) {
      // 클라우드가 더 최신 데이터인 경우 -> 내려받아 머지
      console.log("☁️ [자동 동기화] 클라우드 데이터가 더 최신입니다. 자동 복원 병합 진행...");
      if (setFeedback) setFeedback({ message: '☁️ 구글 드라이브의 최신 지공 기록을 자동으로 가져오는 중...', tone: 'info' });
      await performRestore('merge');
      if (setFeedback) setFeedback({ message: '☁️ 클라우드 동기화 완료!', tone: 'success' });
    } else {
      // 로컬 데이터가 더 최신인 경우 -> 즉시 업로드하여 클라우드 갱신
      console.log("☁️ [자동 동기화] 로컬 데이터가 더 최신입니다. 클라우드 자동 백업 진행...");
      await performBackup();
    }
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

    // 만약 401(인증 만료) 또는 403(권한 없음) 오류가 발생했다면 자동으로 구글 연동해제하여 유령 토큰 상태 정리
    if (errorCode === 401 || errorCode === 403 || errorMsg.includes('auth') || errorMsg.includes('credential')) {
      console.warn("🔐 [자동 동기화] 구글 인증 만료 또는 권한 만료 감지. 안전한 연동해제 및 세션 정리를 수행합니다.");
      try {
        const { signOutGoogle } = await import('./googleDriveBackup.js');
        await signOutGoogle();
      } catch (e) {
        console.error("구글 강제 로그아웃 실패:", e);
      }
    }
  }
};

// 6. 데이터 변경 발생 시 자동 백그라운드 백업 (Debounced Auto Save)
export const autoSyncOnChange = () => {
  const autoSyncEnabled = localStorage.getItem('prodrill_auto_sync_enabled') !== 'false';
  if (!autoSyncEnabled || !isLicenseCertified() || !isGoogleSignedIn() || (typeof navigator !== 'undefined' && !navigator.onLine)) return;

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

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handleFinalSync();
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handleFinalSync);
  window.addEventListener('beforeunload', handleFinalSync);

  return () => {
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handleFinalSync);
    window.removeEventListener('beforeunload', handleFinalSync);
  };
};
