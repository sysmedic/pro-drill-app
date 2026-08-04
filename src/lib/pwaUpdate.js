/**
 * ProDrill 최신 배포본 검색 및 PWA/브라우저 앱 갱신 헬퍼
 */
export async function checkForAppUpdate(setFeedback) {
  if (setFeedback) {
    setFeedback({
      message: '🔄 최신 배포본을 검사하고 있습니다...',
      type: 'info'
    });
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        // 서버의 최신 service worker 스크립트 갱신 여부 탐색
        await registration.update();

        // 대기 중인 설치 완료 새 서비스 워커가 있으면 스킵 웨이팅 요청
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  } catch (err) {
    console.warn('서비스 워커 갱신 체크 중 알림:', err);
  }

  // 성공 피드백 알림 후 최신 리소스 기반 새로고침
  if (setFeedback) {
    setFeedback({
      message: '✨ 최신 배포본 검사 완료! 앱을 새로고침합니다.',
      type: 'success'
    });
  }

  setTimeout(() => {
    window.location.reload(true);
  }, 600);
}
