/**
 * 외부 배포(Vercel Production) 전용 소스코드 유출 방어 및 디버깅 차단 모듈
 * (로컬 localhost 개발 환경에서는 지공사님의 원활한 개발을 위해 100% 자동 해제됩니다)
 */

export function initAntiInspectionGuard() {
  if (typeof window === 'undefined') return;

  // 🛡️ 1. 로컬 개발 환경(localhost, 127.0.0.1)에서는 차단을 적용하지 않고 바이패스
  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.');

  if (isLocalhost && !import.meta.env.PROD) {
    return;
  }

  // 🛡️ 2. 마우스 우클릭 (컨텍스트 메뉴 및 검사 메뉴) 원천 차단
  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
      return false;
    },
    { capture: true }
  );

  // 🛡️ 3. 개발자 도구 단축키 (F12, Ctrl+Shift+I/J/C, Cmd+Option+I/J/C, Ctrl+U, Ctrl+S) 차단
  document.addEventListener(
    'keydown',
    (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // F12 키 차단
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + Shift + I / J / C (개발자도구 / 콘솔 / 요소선택)
      if (ctrlOrCmd && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + U (페이지 소스 보기)
      if (ctrlOrCmd && ['U', 'u'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl/Cmd + S (페이지 전체 저장)
      if (ctrlOrCmd && ['S', 's'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 🛡️ 4. 콘솔 출력 무력화 및 디버깅 방어
  try {
    const noop = () => {};
    window.console.log = noop;
    window.console.debug = noop;
    window.console.info = noop;
    window.console.warn = noop;
  } catch (err) {
    // 무시
  }
}
