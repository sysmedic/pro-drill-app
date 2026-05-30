import { useEffect, useCallback } from 'react';

export default function useViewportControl({
  activeMemoId,
  activeMemo,
  setDelayedActiveMemoId,
  refs: { chartRef, taskRef, specRef, formRef },
  modalDeps = []
}) {
  
  // 뷰포트 배율 강제 리셋 및 콜백 실행 함수
  const forceZoomResetAndExecute = useCallback((callback) => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      setTimeout(() => {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0');
        if (callback) callback();
      }, 150);
    } else {
      if (callback) callback();
    }
  }, []);

  // 메모 활성화 시 뷰포트 고정 및 해당 위치 자동 스크롤 제어
  useEffect(() => {
    let timeoutId;

    if (activeMemoId) {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      const unlockedViewport = 'width=device-width, initial-scale=1.0'; 
      
      if (viewportMeta) {
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }

      if (activeMemo) {
        let targetRef = chartRef;
        if (activeMemo.section === 'task') targetRef = taskRef;
        else if (activeMemo.section === 'spec') targetRef = specRef;
        else if (activeMemo.section === 'form') targetRef = formRef;

        if (targetRef && targetRef.current) {
          setTimeout(() => {
            targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }
      }

      timeoutId = setTimeout(() => {
        if (viewportMeta) {
          viewportMeta.setAttribute('content', unlockedViewport); 
        }
        setDelayedActiveMemoId(activeMemoId);
      }, 350); 
    } else {
      setDelayedActiveMemoId(null);
    }

    return () => clearTimeout(timeoutId); 
  }, [activeMemoId, activeMemo, chartRef, taskRef, specRef, formRef, setDelayedActiveMemoId]);

  // 각 모달 및 입력 폼 전환 시 모바일 화면 줌 현상 방지 락킹
  useEffect(() => {
    let timeoutId;
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const unlockedViewport = 'width=device-width, initial-scale=1.0'; 
    
    if (viewportMeta) {
      viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      
      timeoutId = setTimeout(() => {
        viewportMeta.setAttribute('content', unlockedViewport); 
      }, 350);
    }

    return () => clearTimeout(timeoutId); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, modalDeps);

  return { forceZoomResetAndExecute };
}