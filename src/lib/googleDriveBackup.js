/* global gapi, google */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
const BACKUP_FILE_NAME = 'prodrill_backup.json';

let tokenClient = null;
let accessToken = null;
let gapiInitialized = false;

// 1. gapi 및 GIS 스크립트 로드 체크 및 이닛
export const initGoogleApi = () => {
  return new Promise((resolve, reject) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      reject(new Error('NETWORK_OFFLINE'));
      return;
    }

    if (typeof gapi === 'undefined' || typeof google === 'undefined') {
      reject(new Error('GOOGLE_SDK_NOT_LOADED'));
      return;
    }

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
export const signInGoogle = (forceNew = false) => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('TOKEN_CLIENT_NOT_INITIALIZED'));
      return;
    }

    if (!forceNew) {
      const cachedToken = localStorage.getItem('prodrill_google_access_token');
      const expiry = localStorage.getItem('prodrill_google_token_expiry');
      if (cachedToken && expiry && new Date().getTime() < Number(expiry)) {
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
      if (response.error !== undefined) {
        reject(response);
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
      localStorage.setItem('prodrill_google_scopes_version', 'v2_email_included');
      gapi.client.setToken({ access_token: accessToken });
      resolve(accessToken);
    };
    
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

// 3. 구글 연결 끊기 (토큰 회수 및 삭제)
export const signOutGoogle = () => {
  if (accessToken) {
    try {
      google.accounts.oauth2.revoke(accessToken, () => {});
    } catch (e) {
      console.error("토큰 회수 실패:", e);
    }
  }
  accessToken = null;
  localStorage.removeItem('prodrill_google_access_token');
  localStorage.removeItem('prodrill_google_token_expiry');
  localStorage.removeItem('prodrill_google_scopes_version');
};

export const isGoogleSignedIn = () => {
  const cachedToken = localStorage.getItem('prodrill_google_access_token');
  const expiry = localStorage.getItem('prodrill_google_token_expiry');
  return !!(cachedToken && expiry && new Date().getTime() < Number(expiry));
};

// 4. 구글 드라이브에서 백업 파일 정보 찾기
export const findBackupFile = async () => {
  await initGoogleApi();
  if (!isGoogleSignedIn()) {
    await signInGoogle();
  }

  const response = await gapi.client.drive.files.list({
    q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
    fields: 'files(id, name, modifiedTime)',
    spaces: 'drive',
  });

  const files = response.result.files || [];
  return files.length > 0 ? files[0] : null;
};

// 5. 구글 드라이브에 백업 업로드 (JSON 형식)
export const uploadBackupData = async (payload) => {
  await initGoogleApi();
  if (!isGoogleSignedIn()) {
    await signInGoogle();
  }

  const backupFile = await findBackupFile();
  const fileContent = JSON.stringify(payload, null, 2);
  const fileId = backupFile ? backupFile.id : null;

  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: BACKUP_FILE_NAME,
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

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  let method = 'POST';

  if (fileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  }

  const response = await fetch(url, {
    method: method,
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
  return result;
};

// 6. 구글 드라이브로부터 백업 다운로드
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
