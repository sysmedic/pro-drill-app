/* global NDEFReader */
import { useCallback, useState } from 'react';
import { loadCustomers } from '../lib/customerStorage.js';
import { loadChartHistory } from '../lib/chartHistoryStorage.js';

const NFC_SECRET_KEY = "DRL_SU_APP_KEY_2026"; 

const decryptId = (encodedText) => {
  try {
    const decoded = atob(encodedText);
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ NFC_SECRET_KEY.charCodeAt(i % NFC_SECRET_KEY.length));
    }
    return result;
  } catch {
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
        // 안테나가 꺼지기 전 찰나의 순간에 중복 실행되는 것을 원천 차단
        if (controller.signal.aborted) return; 

        // 브라우저의 NFC 수신 인터페이스를 즉시 파괴하여 연결을 끊음
        reader.onreading = null; 

        controller.abort(); 

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

        // 로컬 DB (IndexedDB / LocalStorage)에서 chartId를 순회 검색
        const customers = await loadCustomers();
        let chartData = null;
        let customerData = null;

        for (const customer of customers) {
          const history = await loadChartHistory(customer);
          const found = history.find(record => record.id === chartId);
          if (found) {
            chartData = found;
            customerData = customer;
            break;
          }
        }

        if (!chartData) {
          setFeedback?.({ message: '로컬 기기에 등록되지 않았거나 삭제된 지공 기록입니다.', tone: 'warning' });
          return;
        }

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