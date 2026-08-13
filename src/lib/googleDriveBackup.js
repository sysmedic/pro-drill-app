/* global gapi, google */
const CLIENT_ID = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) || '';
const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_API_KEY) || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

export const isIOSDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

let tokenClient = null;
let accessToken = null;
let gapiInitialized = false;

// 🛡️ TrustedScriptURL 보안 할당 헬퍼 (Trusted Types Policy)
const setTrustedScriptSrc = (scriptElement, url) => {
  if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
    try {
      if (!window.__prodrillPolicy) {
        window.__prodrillPolicy = window.trustedTypes.createPolicy('prodrillScriptPolicy', {
          createScriptURL: (string) => string
        });
      }
      scriptElement.src = window.__prodrillPolicy.createScriptURL(url);
      return;
    } catch { /* policy exists or fallback */ }
  }
  scriptElement.src = url;
};

// ⚡ 구글 SDK 스크립트 (gapi & GIS) 100% 자동 동적 로더
export const ensureGoogleScriptsLoaded = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('NETWORK_OFFLINE'));
      return;
    }
    
    if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google?.accounts?.oauth2) {
      resolve(true);
      return;
    }

    let loadedCount = 0;
    const checkComplete = () => {
      loadedCount++;
      if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google?.accounts?.oauth2) {
        resolve(true);
      } else if (loadedCount >= 2) {
        setTimeout(() => {
          if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
            resolve(true);
          } else {
            reject(new Error('GOOGLE_SDK_NOT_LOADED'));
          }
        }, 300);
      }
    };

    // 1. GAPI 스크립트 주입
    if (typeof gapi === 'undefined' && !document.getElementById('gapi-script-tag')) {
      const gapiScript = document.createElement('script');
      gapiScript.id = 'gapi-script-tag';
      gapiScript.async = true;
      gapiScript.defer = true;
      gapiScript.onload = checkComplete;
      gapiScript.onerror = () => checkComplete();
      setTrustedScriptSrc(gapiScript, 'https://apis.google.com/js/api.js');
      document.head.appendChild(gapiScript);
    } else {
      checkComplete();
    }

    // 2. GIS 스크립트 주입
    if ((typeof google === 'undefined' || !google?.accounts?.oauth2) && !document.getElementById('gis-script-tag')) {
      const gisScript = document.createElement('script');
      gisScript.id = 'gis-script-tag';
      gisScript.async = true;
      gisScript.defer = true;
      gisScript.onload = checkComplete;
      gisScript.onerror = () => checkComplete();
      setTrustedScriptSrc(gisScript, 'https://accounts.google.com/gsi/client');
      document.head.appendChild(gisScript);
    } else {
      checkComplete();
    }
  });
};

// 1. gapi 및 GIS 스크립트 로드 체크 및 이닛
export const initGoogleApi = async () => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('NETWORK_OFFLINE');
  }

  // ⚡ 구글 SDK가 마운트되지 않은 경우 100% 자동 동적 로딩 수행
  await ensureGoogleScriptsLoaded();

  return new Promise((resolve, reject) => {
    if (gapiInitialized) {
      resolve(true);
      return;
    }

    const isKeyInvalid = !CLIENT_ID || !API_KEY || 
                         CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID') || 
                         API_KEY.includes('YOUR_GOOGLE_API_KEY') ||
                         CLIENT_ID.trim() === '' ||
                         API_KEY.trim() === '';

    if (isKeyInvalid) {
      reject(new Error('GOOGLE_API_KEYS_MISSING'));
      return;
    }

    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.error !== undefined) {
              const rawGisMsg = response.error_description || response.error || 'OAuth client validation failed';
              reject(new Error(rawGisMsg, { cause: response }));
              return;
            }

            const grantedScopes = response.scope || '';
            const hasDrive = grantedScopes.includes('https://www.googleapis.com/auth/drive.file');
            const hasEmail = grantedScopes.includes('https://www.googleapis.com/auth/userinfo.email') || grantedScopes.includes('email');

            if (!hasDrive || !hasEmail) {
              reject(new Error('REQUIRED_SCOPES_MISSING'));
              return;
            }

            accessToken = response.access_token;
            localStorage.setItem('prodrill_google_access_token', accessToken);
            localStorage.setItem('prodrill_google_token_expiry', String(new Date().getTime() + (response.expires_in * 1000)));
            localStorage.setItem('prodrill_google_scopes_version', 'v2_email_included'); // 버전 명시
            resolve(accessToken);
          },
        });

        const SCOPE_VERSION_KEY = 'v2_email_included';
        const cachedToken = localStorage.getItem('prodrill_google_access_token');
        const scopeVersion = localStorage.getItem('prodrill_google_scopes_version');
        
        // [알림] 이메일 권한이 없는 구버전 스코프 토큰 발견 시 자동 무효화(삭제) 처리
        if (cachedToken && scopeVersion !== SCOPE_VERSION_KEY) {
          localStorage.removeItem('prodrill_google_access_token');
          localStorage.removeItem('prodrill_google_token_expiry');
          localStorage.removeItem('prodrill_google_scopes_version');
        }

        const validCachedToken = localStorage.getItem('prodrill_google_access_token');
        const expiry = localStorage.getItem('prodrill_google_token_expiry');
        if (validCachedToken && expiry && new Date().getTime() < Number(expiry)) {
          accessToken = validCachedToken;
          gapi.client.setToken({ access_token: accessToken });
        }

        gapiInitialized = true;
        resolve(true);
      } catch (err) {
        const rawMsg = err?.result?.error?.message || err?.details || err?.message || JSON.stringify(err);
        reject(new Error(rawMsg, { cause: err }));
      }
    });
  });
};

// 2. 구글 로그인 및 토큰 획득
export const signInGoogle = (forceNew = false, isLoginGateOnly = false) => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('TOKEN_CLIENT_NOT_INITIALIZED'));
      return;
    }

    // ⚡ 팝업 차단 및 COOP 지연 대비 안전 타임아웃 (10초)
    let isSettled = false;
    const timeoutId = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        reject(new Error('IOS_POPUP_BLOCKED_OR_TIMED_OUT'));
      }
    }, 10000);

    if (!forceNew) {
      const cachedToken = localStorage.getItem('prodrill_google_access_token');
      const expiry = localStorage.getItem('prodrill_google_token_expiry');
      if (cachedToken && expiry && new Date().getTime() < Number(expiry)) {
        clearTimeout(timeoutId);
        accessToken = cachedToken;
        gapi.client.setToken({ access_token: accessToken });
        resolve(accessToken);
        return;
      }
    } else {
      // 강제 재인증 시 기존의 잘못되었을 수 있는 로컬 캐시를 삭제
      localStorage.removeItem('prodrill_google_access_token');
      localStorage.removeItem('prodrill_google_token_expiry');
      accessToken = null;
    }

    tokenClient.callback = (response) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutId);

      if (response.error !== undefined) {
        reject(response);
        return;
      }

      const grantedScopes = response.scope || '';
      const hasEmail = grantedScopes.includes('https://www.googleapis.com/auth/userinfo.email') || grantedScopes.includes('email');

      if (isLoginGateOnly) {
        if (!hasEmail) {
          reject(new Error('REQUIRED_SCOPES_MISSING'));
          return;
        }
      } else {
        const hasDrive = grantedScopes.includes('https://www.googleapis.com/auth/drive.file');
        if (!hasDrive || !hasEmail) {
          reject(new Error('REQUIRED_SCOPES_MISSING'));
          return;
        }
        localStorage.setItem('prodrill_google_scopes_version', 'v2_email_included');
      }

      accessToken = response.access_token;
      localStorage.removeItem('prodrill_user_logged_out');
      localStorage.setItem('prodrill_google_access_token', accessToken);
      localStorage.setItem('prodrill_google_token_expiry', String(new Date().getTime() + (response.expires_in * 1000)));
      gapi.client.setToken({ access_token: accessToken });
      resolve(accessToken);
    };
    
    const isIOS = isIOSDevice();
    const promptOption = isIOS ? '' : 'select_account';
    
    if (isLoginGateOnly) {
      // 🔒 최초 가동 시 구글 403 access_denied(Testing 모드 차단)를 예방하기 위해 드라이브 권한 제외 최소 이메일 권한만 호출!
      tokenClient.requestAccessToken({ 
        scope: 'https://www.googleapis.com/auth/userinfo.email',
        ...(promptOption ? { prompt: promptOption } : {})
      });
    } else {
      tokenClient.requestAccessToken({ 
        ...(promptOption ? { prompt: promptOption } : {})
      });
    }
  });
};

// 3. 구글 연결 끊기 (토큰 회수 및 삭제)
export const signOutGoogle = () => {
  if (accessToken && typeof google !== 'undefined' && google.accounts?.oauth2) {
    try {
      google.accounts.oauth2.revoke(accessToken, () => {});
    } catch (e) {
      console.error("토큰 회수 실패:", e);
    }
  }
  if (typeof google !== 'undefined' && google.accounts?.id?.disableAutoSelect) {
    try {
      google.accounts.id.disableAutoSelect();
    } catch (e) {
      console.warn("disableAutoSelect 실패:", e);
    }
  }
  if (typeof gapi !== 'undefined' && gapi.client) {
    try {
      gapi.client.setToken(null);
    } catch { /* ignore */ }
  }
  accessToken = null;
  localStorage.setItem('prodrill_user_logged_out', 'true');
  localStorage.removeItem('prodrill_certified_email_hash');
  localStorage.removeItem('prodrill_certified_email_plain');
  localStorage.removeItem('prodrill_license_status');
  localStorage.removeItem('prodrill_linked_email');
  localStorage.removeItem('prodrill_trial_google_linked');
  localStorage.removeItem('prodrill_google_access_token');
  localStorage.removeItem('prodrill_google_token_expiry');
  localStorage.removeItem('prodrill_google_scopes_version');
  localStorage.removeItem('prodrill_first_time_setup_done');
};

export const isGoogleSignedIn = () => {
  if (typeof window !== 'undefined' && localStorage.getItem('prodrill_user_logged_out') === 'true') {
    return false;
  }
  const cachedToken = localStorage.getItem('prodrill_google_access_token');
  const expiry = localStorage.getItem('prodrill_google_token_expiry');
  const hasValidToken = !!(cachedToken && expiry && new Date().getTime() < Number(expiry));
  if (hasValidToken) return true;

  // 🛡️ [무소음 자동 토큰 갱신 지원]: 기존 연동 이메일이 있고 사용자가 직접 로그아웃하지 않았다면 연동 유효 상태로 인식
  const linkedEmail = typeof window !== 'undefined' ? localStorage.getItem('prodrill_linked_email') : null;
  return !!linkedEmail;
};

export const ensureActiveGoogleToken = async () => {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('prodrill_user_logged_out') === 'true') return false;

  const cachedToken = localStorage.getItem('prodrill_google_access_token');
  const expiry = localStorage.getItem('prodrill_google_token_expiry');
  const isTokenValid = !!(cachedToken && expiry && new Date().getTime() < Number(expiry));

  if (isTokenValid && accessToken) {
    return true;
  }

  if (isTokenValid && cachedToken) {
    accessToken = cachedToken;
    try {
      if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken({ access_token: cachedToken });
      }
    } catch { /* ignore */ }
    return true;
  }

  const linkedEmail = localStorage.getItem('prodrill_linked_email');
  if (!linkedEmail) return false;

  // 무소음 사이일런트 토큰 재발급 시도
  try {
    await signInGoogle(false, false);
    return true;
  } catch (err) {
    console.warn("🔐 [자동 토큰 갱신]: 무소음 구글 인증 실패", err);
    return false;
  }
};

// 4. 구글 드라이브에서 보관 중인 백업 스냅샷 목록 조회 (최대 100개)
export const listBackupSnapshots = async () => {
  await initGoogleApi();
  await ensureActiveGoogleToken();

  const response = await gapi.client.drive.files.list({
    q: "(name contains 'prodrill_backup' or name = 'prodrill_backup.json') and trashed = false",
    fields: 'files(id, name, createdTime, modifiedTime, description, size)',
    orderBy: 'modifiedTime desc, createdTime desc',
    pageSize: 150,
  });

  const files = response.result.files || [];

  // 🌟 [정밀 시각 파싱 정렬]: 파일명(prodrill_backup_YYYYMMDD_HHMMSS) 및 수정시각을 직접 파싱하여 1초 오차 없이 최신 백업본(57분) 1순위 보장
  files.sort((a, b) => {
    const getFileTime = (file) => {
      const match = (file.name || '').match(/prodrill_backup_(\d{8})_(\d{6})\.json/);
      if (match) {
        const yyyymmdd = match[1];
        const hhmmss = match[2];
        const iso = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}T${hhmmss.slice(0, 2)}:${hhmmss.slice(2, 4)}:${hhmmss.slice(4, 6)}`;
        const t = new Date(iso).getTime();
        if (!isNaN(t)) return t;
      }
      return new Date(file.modifiedTime || file.createdTime || 0).getTime();
    };
    return getFileTime(b) - getFileTime(a);
  });
  return files.map(file => {
    let meta = {};
    try {
      if (file.description) meta = JSON.parse(file.description);
    } catch { /* ignore */ }

    return {
      id: file.id,
      name: file.name,
      createdTime: file.createdTime || file.modifiedTime,
      customerCount: typeof meta.customerCount === 'number' ? meta.customerCount : 0,
      chartCount: typeof meta.chartCount === 'number' ? meta.chartCount : 0,
      size: file.size || '0'
    };
  });
};

// 4.5. 가장 최근 백업 스냅샷 파일 단건 찾기
export const findBackupFile = async () => {
  const snapshots = await listBackupSnapshots();
  return snapshots.length > 0 ? snapshots[0] : null;
};

// 5. 구글 드라이브에 타임스탬프 스냅샷 업로드 (최대 100개 보관 유지 & FIFO 자동 정리)
export const uploadBackupData = async (payload) => {
  await initGoogleApi();
  await ensureActiveGoogleToken();

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestampStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const snapshotFileName = `prodrill_backup_${timestampStr}.json`;

  const customerList = Array.isArray(payload?.data?.customers)
    ? payload.data.customers
    : (Array.isArray(payload?.customers) ? payload.customers : []);
  const customerCount = customerList.length;

  const chartMap = (payload?.data?.chartHistories && typeof payload.data.chartHistories === 'object')
    ? payload.data.chartHistories
    : (payload?.chartHistories && typeof payload.chartHistories === 'object' ? payload.chartHistories : {});
  
  let chartCount = 0;
  Object.values(chartMap).forEach(records => {
    if (Array.isArray(records)) {
      chartCount += records.length;
    }
  });

  const description = JSON.stringify({
    customerCount,
    chartCount,
    createdAt: now.toISOString()
  });

  const fileContent = JSON.stringify(payload, null, 2);
  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: snapshotFileName,
    description: description,
    mimeType: 'application/json',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BACKUP_UPLOAD_FAILED: ${errorText}`);
  }

  const result = await response.json();

  // 🧹 백업이 100개를 초과할 경우 가장 오래된 101번째 이상 스냅샷 자동 삭제 (FIFO Retention)
  try {
    const snapshots = await listBackupSnapshots();
    if (snapshots.length > 100) {
      const olderFiles = snapshots.slice(100);
      for (const oldFile of olderFiles) {
        await gapi.client.drive.files.delete({ fileId: oldFile.id }).catch(() => {});
      }
    }
  } catch (cleanErr) {
    console.warn("오래된 스냅샷 자동 정리 스킵:", cleanErr);
  }

  return result;
};

// 6. 구글 드라이브로부터 백업 다운로드 (특정 스냅샷 ID 지원)
export const downloadBackupData = async (fileId = null) => {
  await initGoogleApi();
  if (!isGoogleSignedIn()) {
    await signInGoogle();
  }

  let targetFileId = fileId;
  if (!targetFileId) {
    const backupFile = await findBackupFile();
    if (!backupFile) {
      throw new Error('BACKUP_FILE_NOT_FOUND');
    }
    targetFileId = backupFile.id;
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${targetFileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('BACKUP_DOWNLOAD_FAILED');
  }

  const data = await response.json();
  return data;
};

// 7. 현재 로그인된 구글 사용자의 이메일 주소 조회
export const getGoogleUserEmail = async () => {
  if (!accessToken) {
    throw new Error('NO_ACCESS_TOKEN');
  }
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('FAILED_TO_GET_USERINFO');
  }
  const data = await response.json();
  return data.email || '';
};
