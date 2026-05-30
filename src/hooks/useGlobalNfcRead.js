import { useCallback, useState } from 'react';
import { db, auth } from '../firebase'; // 🌟 [최소 수정 1] 현재 유저 인증 정보 확인을 위해 auth 수입 추가
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

        const chartDocRef = doc(db, 'drilling_charts', chartId);
        const chartSnap = await getDoc(chartDocRef);

        if (!chartSnap.exists()) {
          setFeedback?.({ message: '서버에 등록되지 않았거나 삭제된 지공 기록입니다.', tone: 'warning' });
          return;
        }

        const chartData = chartSnap.data();

        // 🌟 [최소 수정 2]: 보안 필터링 레이어 탑재
        // 차트를 생성한 소유자(userId)와 현재 로그인한 지공사(auth.currentUser.uid)가 다르면 열기 즉시 차단
        if (chartData.userId !== auth.currentUser?.uid) {
          setFeedback?.({ 
            message: '⚠️ 타인이 등록한 볼 태그이거나 해당 지공 차트에 대한 접근 권한이 없습니다.', 
            tone: 'danger' 
          });
          return;
        }

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