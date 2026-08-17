/* global __APP_BUILD_DATE__ */
/**
 * ProDrill 최신 배포본 검색 및 PWA/브라우저 앱 배포일자 검사 헬퍼
 */
export const CURRENT_APP_BUILD_DATE = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : '2026.08.09 15:00';

export async function fetchServerVersionInfo() {
  try {
    const timestamp = new Date().getTime();
    const res = await fetch(`/version.json?noCache=${timestamp}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('서버 버전 정보 수신 중 알림:', err);
  }
  return null;
}

export async function checkForAppUpdate() {
  const serverInfo = await fetchServerVersionInfo();

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    } catch (err) {
      console.warn('서비스 워커 갱신 체크 중 알림:', err);
    }
  }

  const currentBuild = CURRENT_APP_BUILD_DATE;
  const serverBuild = serverInfo?.buildDate || currentBuild;
  const hasNewVersion = Boolean(serverBuild && currentBuild && serverBuild !== currentBuild);

  return {
    currentBuild,
    serverBuild,
    hasNewVersion,
    serverTimestamp: serverInfo?.timestamp
  };
}

export function triggerAppReload() {
  if (typeof window !== 'undefined') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.update();
        }
      });
    }
    window.location.reload(true);
  }
}
