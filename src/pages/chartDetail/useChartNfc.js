/* global NDEFReader */
import { useCallback } from 'react';

const NFC_SECRET_KEY = "DRL_SU_APP_KEY_2026"; 

const encryptId = (text) => {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ NFC_SECRET_KEY.charCodeAt(i % NFC_SECRET_KEY.length));
  }
  return btoa(result); 
};

export default function useChartNfc({
  sessionRecordId,
  hasUnsavedChanges,
  setFeedback,
  setUtilityState,
}) {
  
  const handleNfcWrite = useCallback(async () => {
    if (hasUnsavedChanges || !sessionRecordId) {
      setFeedback({
        message: '저장되지 않은 변경사항이 있습니다. 우측 상단 [완료]를 눌러 차트를 먼저 저장해주세요.',
        tone: 'warning',
      });
      return;
    }

    if (!('NDEFReader' in window)) {
      setFeedback({
        message: '이 기기나 브라우저는 NFC 기능을 지원하지 않습니다. (안드로이드 크롬 권장)',
        tone: 'danger',
      });
      return;
    }

    const controller = new AbortController();
    let timeoutId = null;

    try {
      setFeedback({ message: 'NFC 태그 대기 중 (30초)... 스마트폰 뒷면에 대주세요.', tone: 'info' });
      setUtilityState('collapsed');

      // 🟢 30초 타임아웃 타이머 가동
      timeoutId = setTimeout(() => {
        controller.abort(); 
        setFeedback({ message: 'NFC 쓰기 시간이 초과되었습니다. 다시 시도해주세요.', tone: 'warning' });
      }, 30000); 

      const encryptedId = encryptId(sessionRecordId);
      const reader = new NDEFReader();
      
      // 🌟 [최소 수정] 타임아웃 연동을 위해 signal 주입 (불필요한 scan 호출 제거)
      await reader.write({
        records: [
          {
            recordType: 'text',
            lang: 'en',
            data: `DRL_APP:${encryptedId}`, 
          },
        ],
      }, { signal: controller.signal });

      if (timeoutId) clearTimeout(timeoutId);
      setFeedback({ message: '지공 레코드 ID가 암호화되어 태그에 안전하게 기록되었습니다!', tone: 'success' });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(error);
        setFeedback({ message: `NFC 쓰기 실패: ${error.message}`, tone: 'danger' });
      }
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, [sessionRecordId, hasUnsavedChanges, setFeedback, setUtilityState]);

  return { handleNfcWrite };
}