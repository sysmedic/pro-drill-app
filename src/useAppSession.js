import { useState, useEffect, useCallback } from 'react';

// 오프라인 전용 가상 지공사 계정 정보 정의
const LOCAL_USER = {
  uid: 'local_driller',
  email: 'guest@prodrill.local',
  displayName: '지공사'
};

export default function useAppSession() {
  const [user, setUser] = useState(LOCAL_USER);
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [userTier, setUserTier] = useState("master");
  const [maxChartsAllowed, setMaxChartsAllowed] = useState(Infinity);
  const [currentChartsCount, setCurrentChartsCount] = useState(0);

  const isAdmin = false; // 마스터제어실 제거에 따라 항상 false

  // 실시간 차트 카운트 함수 (로컬 DB 카운트 계측)
  const refreshChartCount = useCallback(async (uid) => {
    if (!uid) return;
    try {
      // IndexedDB가 연결된 이후 해당 모듈에서 총 차트 갯수를 세어 세팅할 예정
      // 초기에는 0으로 우선 세팅
      if (globalThis.indexedDbHelper) {
        const count = await globalThis.indexedDbHelper.getChartsCount();
        setCurrentChartsCount(count || 0);
      } else {
        // 폴백으로 localStorage 키 갯수 세기
        const keys = Object.keys(localStorage);
        const chartKeys = keys.filter(k => k.startsWith('chart_history_v8_'));
        setCurrentChartsCount(chartKeys.length);
      }
    } catch (error) {
      console.error("카운트 조회 에러:", error);
    }
  }, []);

  // 인증 확인 중 즉시 완료 처리
  useEffect(() => {
    setUser(LOCAL_USER);
    setUserTier("master");
    setMaxChartsAllowed(Infinity);
    refreshChartCount(LOCAL_USER.uid);
    setIsAuthChecking(false);
  }, [refreshChartCount]);

  return {
    user,
    isAuthChecking,
    authErrorMsg: "",
    userTier,
    maxChartsAllowed,
    currentChartsCount,
    isAdmin,
    refreshChartCount
  };
}