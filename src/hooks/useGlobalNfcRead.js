import { useCallback, useState } from 'react';
import { db } from '../firebase'; 
import { doc, getDoc } from 'firebase/firestore';

const NFC_SECRET_KEY = "DRL_SU_APP_KEY_2026"; 

const decryptId = (encodedText) => {
  try {
    const decoded = atob(encodedText);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ NFC_SECRET_KEY.charCodeAt(i % NFC_SECRET_KEY.length));
    }
    return result;
  } catch (error) {
    return null;
  }
};

export default function useGlobalNfcRead({ onWalletJump, setFeedback }) {
  const [isScanning, setIsScanning] = useState(false);

  const handleGlobalNfcRead = useCallback(async () => {
    if (!('NDEFReader' in window)) {
      setFeedback?.({
        message: '이 기기나 브라우저는 NFC 읽기를 지원하지 않습니다. (안드로이드 크롬 권장)',
        tone: 'danger',
      });
      return;
    }

    const controller = new AbortController();
    let timeoutId = null;

    try {
      setIsScanning(true);
      setFeedback?.({ message: '볼 태그 대기 중 (30초)... 스마트폰 뒷면에 대주세요.', tone: 'info' });

      // 🟢 30초 타임아웃 타이머 가동
      timeoutId = setTimeout(() => {
        controller.abort(); 
        setFeedback?.({ message: 'NFC 스캔 시간이 초과되었습니다. 다시 시도해주세요.', tone: 'warning' });
        setIsScanning(false);
      }, 30000); 

      const reader = new NDEFReader();
      await reader.scan({ signal: controller.signal });

      reader.onreading = async ({ message }) => {
        if (timeoutId) clearTimeout(timeoutId);
        setIsScanning(false);

        const record = message.records[0];
        const decoder = new TextDecoder();
        const rawData = decoder.decode(record.data);

        if (!rawData.startsWith('DRL_APP:')) {
          setFeedback?.({ message: '올바른 지공 지원 앱 데이터 서식이 아닙니다.', tone: 'danger' });
          return;
        }

        const encryptedId = rawData.split(':')[1];
        const chartId = decryptId(encryptedId);

        if (!chartId) {
          setFeedback?.({ message: '태그 데이터 복호화에 실패했습니다.', tone: 'danger' });
          return;
        }

        const chartDocRef = doc(db, 'drilling_charts', chartId);
        const chartSnap = await getDoc(chartDocRef);

        if (!chartSnap.exists()) {
          setFeedback?.({ message: '서버에 등록되지 않았거나 삭제된 지공 기록입니다.', tone: 'warning' });
          return;
        }

        const chartData = chartSnap.data();
        const customerId = chartData.customerId;

        const customerDocRef = doc(db, 'customers', customerId);
        const customerSnap = await getDoc(customerDocRef);

        if (!customerSnap.exists()) {
          setFeedback?.({ message: '연동된 고객 정보가 존재하지 않습니다.', tone: 'warning' });
          return;
        }

        const customerData = { id: customerSnap.id, ...customerSnap.data() };

        setFeedback?.({ 
          message: `[${customerData.name}] 고객님의 해당 차트로 점프합니다!`, 
          tone: 'success' 
        });

        if (onWalletJump) {
          onWalletJump(customerData, chartId);
        }
      };

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("글로벌 NFC 스캔 실패:", error);
        setFeedback?.({ message: `NFC 스캔 실패: ${error.message}`, tone: 'danger' });
      }
      if (timeoutId) clearTimeout(timeoutId);
      setIsScanning(false);
    }
  }, [onWalletJump, setFeedback]);

  return { handleGlobalNfcRead, isScanning };
}