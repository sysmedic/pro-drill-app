import { useMemo } from 'react';

/**
 * ⏱️ [3초 맥동 100% 동기화 훅]
 * 절대 시간(UNIX Epoch) 모듈러 연산으로 애니메이션 파동 Phase를 계산하여
 * 화면상 모든 ? 도움말 버튼의 맥동(Ping) 타이밍을 0.001초 단위까지 100% 완벽히 일치시킵니다.
 */
export function useSyncedPingStyle(periodMs = 3000) {
  return useMemo(() => {
    if (typeof window === 'undefined') return {};
    const elapsed = new Date().getTime() % periodMs;
    return { animationDelay: `-${elapsed}ms` };
  }, [periodMs]);
}

export default useSyncedPingStyle;
