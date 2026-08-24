import { useEffect } from 'react';

/**
 * 🔒 모달 전용 통합 락 훅 (Body Scroll Lock & iOS/Android Screen Wake Lock API)
 * 
 * 1) 뒤쪽 배경 스크롤 차단 (overflow: hidden)
 * 2) iOS (Safari 16.4+ / PWA) 및 안드로이드 Chrome에서 모달 오픈 중 디바이스 화면 꺼짐 방지
 */
export function useModalLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;

    // 1. 뒤쪽 배경 스크롤 차단
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 2. iOS & 안드로이드 화면 꺼짐 방지 (Screen Wake Lock API)
    let wakeLock = null;
    let isReleased = false;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && !isReleased) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
          // Wake lock unavailable or permission denied
        }
      }
    };

    requestWakeLock();

    // 앱 화면 백그라운드 전환 후 복귀 시 자동 재요청
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 언마운트 또는 모달 닫힘 시 원상 복원 및 Wake Lock 해제
    return () => {
      isReleased = true;
      document.body.style.overflow = originalOverflow || '';
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [isOpen]);
}
