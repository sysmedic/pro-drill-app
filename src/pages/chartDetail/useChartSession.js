import { useState, useEffect, useCallback, useRef } from 'react';
import { getCustomerChartProfile } from '../../lib/customerSchema.js';
import { createLocalId } from '../../lib/ids.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase'; 
// 🌟 슈파베이스 클라이언트 및 모드 스위치 수입
import { supabase, dbMode } from '../../supabaseClient'; 

const createDefaultChartData = ({ handedness = 'right', isThumbless = false } = {}) => ({
  isThumbless,
  handedness,
  handCondition: { moisture: '', fingerStiffness: '', thumbStiffness: '' },
  midPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '', holeCutSize: '' },
  ringPitch: { up: '', down: '', lat: '', latDir: '', insertSize: '', tipType: '', holeCutSize: '' },
  thumbPitch: { up: '', down: '', left: '', right: '' },
  thumbOffset: { left: '', right: '' },
  thumbDetails: { holeSize: '', ovalSize: '', slugType: '', holeCutSize: '' },
  bridge: '3/16',
  spanLeft: '',
  spanRight: '',
  spanType: '',
  ovalAngle: '',
  drillingGuide: { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
});

const generateTimelineLogMessage = (isNewSession, currentData, originalData) => {
  if (isNewSession) return currentData.intent?.trim() || '등록된 상담 내용이 없습니다.';

  const currentLogs = Array.isArray(currentData.chartData?.maintenanceLogs) ? currentData.chartData.maintenanceLogs : [];
  const originalLogs = Array.isArray(originalData?.chartData?.maintenanceLogs) ? originalData.chartData.maintenanceLogs : [];
  const currentMemosList = Array.isArray(currentData.memos) ? currentData.memos : [];
  const originalMemosList = Array.isArray(originalData?.memos) ? originalData.memos : [];
  
  const currentIntentText = currentData.intent || '';
  const originalIntentText = originalData?.intent || '';

  if (currentLogs.length > originalLogs.length) return currentLogs[currentLogs.length - 1].text;
  if (currentIntentText.trim() !== originalIntentText.trim()) return '상담 내용 및 지공 의도 변경';
  
  const currentChart = currentData.chartData || {};
  const originalChart = originalData?.chartData || {};
  
  const currentCustomerInfo = currentData.customerInfo || {};
  const originalCustomerInfo = originalData?.customerInfo || {};

  const isSpecChanged = 
    currentChart.isThumbless !== originalChart.isThumbless ||
    currentChart.bridge !== originalChart.bridge ||
    currentChart.spanType !== originalChart.spanType ||
    currentChart.spanLeft !== originalChart.spanLeft ||
    currentChart.spanRight !== originalChart.spanRight ||
    currentChart.ovalAngle !== originalChart.ovalAngle ||
    JSON.stringify(currentChart.midPitch) !== JSON.stringify(originalChart.midPitch) ||
    JSON.stringify(currentChart.ringPitch) !== JSON.stringify(originalChart.ringPitch) ||
    JSON.stringify(currentChart.thumbPitch) !== JSON.stringify(originalChart.thumbPitch) ||
    JSON.stringify(currentChart.thumbOffset) !== JSON.stringify(originalChart.thumbOffset) ||
    JSON.stringify(currentChart.thumbDetails) !== JSON.stringify(originalChart.thumbDetails) ||
    JSON.stringify(currentChart.drillingGuide) !== JSON.stringify(originalChart.drillingGuide) ||
    JSON.stringify(currentCustomerInfo) !== JSON.stringify(originalCustomerInfo);

  if (isSpecChanged) return '차트 세부 수치 업데이트';
  
  if (currentMemosList.length > originalMemosList.length) return '새로운 메모 추가됨';
  return '메모 변경';
};

export default function useChartSession({
  customer, history, loading, maxChartsAllowed, currentChartsCount,
  userTier, refreshChartCount, memos, setMemos, saveRecord, setFeedback,
  setShowHistoryModal,
  showLogsOnChart // 🎯 [고도화 반영]: 현재 토글 스위치 설정 상태 추가 주입 수렴
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [chartData, setChartData] = useState(() => createDefaultChartData());
  const [customerInfo, setCustomerInfo] = useState(() => ({
    fingerStiff: '', thumbStiff: '', moisture: '', trackFlare: '',
    tilt: '', papX: '', papY: '', ballSpeed: '', rpm: ''
  }));
  const [ballName, setBallName] = useState('');
  const [layoutInfo, setLayoutInfo] = useState('');
  const [intent, setIntent] = useState('');
  const [, setSaveDate] = useState('');
  
  const [viewingRecord, _setViewingRecord] = useState(null);
  const viewingRecordRef = useRef(null);
  const setViewingRecord = useCallback((val) => { viewingRecordRef.current = val; _setViewingRecord(val); }, []);

  const [sessionRecordId, _setSessionRecordId] = useState(null);
  const sessionRecordIdRef = useRef(null);
  const setSessionRecordId = useCallback((val) => { sessionRecordIdRef.current = val; _setSessionRecordId(val); }, []);

  const [sessionRecordName, _setSessionRecordName] = useState('');
  const sessionRecordNameRef = useRef('');
  const setSessionRecordName = useCallback((val) => { sessionRecordNameRef.current = val; _setSessionRecordName(val); }, []);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showModifyWarning, setShowModifyWarning] = useState(false); 
  const [hasWarnedModify, setHasWarnedModify] = useState(false);

  const loadedCustomerId = useRef(null);
  const historyLengthRef = useRef(0);

  const customerId = customer?.id;

  useEffect(() => {
    if (loading) return;

    if (loadedCustomerId.current === customerId && (historyLengthRef.current > 0 || history.length === 0)) {
        return; 
    }

    const profile = getCustomerChartProfile(customer);

    const initializeNewCustomer = () => {
      setIsEditMode(true);
      setChartData(createDefaultChartData(profile));
      
      setCustomerInfo({
        fingerStiff: customer?.fingerStiff || '',
        thumbStiff: customer?.thumbStiff || '',
        moisture: customer?.moisture || '',
        trackFlare: customer?.trackFlare || '',
        tilt: customer?.tilt || '',
        papX: customer?.papX || '',
        papY: customer?.papY || '',
        ballSpeed: customer?.ballSpeed || '',
        rpm: customer?.rpm || ''
      });

      setBallName(''); setLayoutInfo(''); setIntent(''); setMemos([]); setSaveDate('');
      setViewingRecord(null); setSessionRecordId(null); setSessionRecordName(''); setHasWarnedModify(false);
    };

    if (history && history.length > 0) {
      if (typeof setShowHistoryModal === 'function' && showLogsOnChart) {
        setShowHistoryModal(true);
      }

      const latestRecord = history[0];
      const recordData = latestRecord.data || latestRecord;

      if (recordData.chartData) {
        setChartData({
          ...createDefaultChartData(profile),
          ...recordData.chartData,
          maintenanceLogs: recordData.chartData.maintenanceLogs || [], 
          thumbOffset: recordData.chartData.thumbOffset || { left: '', right: '' },
          drillingGuide: recordData.chartData.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
          handedness: recordData.chartData.handedness ?? profile.handedness,
          isThumbless: recordData.chartData.isThumbless ?? profile.isThumbless,
        });
      }
      if (recordData.customerInfo) setCustomerInfo(recordData.customerInfo);

      setBallName(recordData.ballName || ''); 
      setLayoutInfo(recordData.layoutInfo || ''); 
      setIntent(recordData.intent || ''); 
      setSaveDate(latestRecord.timestamp || latestRecord.createdAt || '');
      
      setViewingRecord({ 
        id: latestRecord.id, 
        name: latestRecord.name || '불러온 기록', 
        timestamp: latestRecord.timestamp || latestRecord.createdAt 
      }); 
      setSessionRecordId(latestRecord.id); 
      setSessionRecordName(latestRecord.name || '불러온 기록');
      
      setIsEditMode(false); 
      setHasWarnedModify(false);
      
      setMemos(recordData.memos || []); 

      loadedCustomerId.current = customerId;
      historyLengthRef.current = history.length;
    } else {
      initializeNewCustomer();
      loadedCustomerId.current = customerId;
      historyLengthRef.current = 0;
    }

    setHasUnsavedChanges(false);
  }, [customerId, customer, loading, history, setMemos, setSessionRecordId, setSessionRecordName, setViewingRecord, setShowHistoryModal, showLogsOnChart]);

  useEffect(() => {
    if (hasUnsavedChanges && viewingRecord && !hasWarnedModify) {
      setShowModifyWarning(true);
      setHasWarnedModify(true);
    }
  }, [hasUnsavedChanges, viewingRecord, hasWarnedModify]);

  const handleSave = useCallback(async (silent = false) => {
    if (!hasUnsavedChanges) return true;

    const currentSessionId = sessionRecordIdRef.current;
    const currentSessionName = sessionRecordNameRef.current;
    const currentViewingRecord = viewingRecordRef.current;

    const isNewSession = !currentSessionId;
    const recordId = currentSessionId || createLocalId('record');

    if (isNewSession && maxChartsAllowed !== Infinity && currentChartsCount >= maxChartsAllowed) {
      setFeedback({ message: `${userTier.toUpperCase()} 등급은 최대 ${maxChartsAllowed}개의 차트만 저장할 수 있습니다.`, title: '저장 제한', tone: 'warning' });
      return false;
    }

    const nowObj = new Date();
    const nowTimestamp = nowObj.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const yy = String(nowObj.getFullYear()).slice(-2);
    const mm = String(nowObj.getMonth() + 1).padStart(2, '0');
    const dd = String(nowObj.getDate()).padStart(2, '0');
    const dateStr = `${yy}${mm}${dd}`;
    
    let finalRecordName = ballName ? `${ballName} ${dateStr}` : (currentSessionName || (currentViewingRecord ? currentViewingRecord.name : `차트 ${dateStr}`));
    
    if (isNewSession) {
      const existingNames = new Set(history.map(r => r.name || r.data?.name));
      if (existingNames.has(finalRecordName)) {
        let suffix = 1;
        while (existingNames.has(`${finalRecordName}-${suffix}`)) suffix++;
        finalRecordName = `${finalRecordName}-${suffix}`;
      }
    }

    const finalChartData = { ...chartData };
    const finalMemos = [...memos];
    
    const newRecord = {
      id: recordId,
      timestamp: nowTimestamp,
      name: finalRecordName,
      data: { chartData: finalChartData, customerInfo, ballName, layoutInfo, intent, memos: finalMemos },
    };

    const result = await saveRecord(newRecord);
    if (!result.ok) {
      if (!silent) setFeedback({ message: '클라우드 저장에 실패했습니다. 네트워크 상태를 확인해주세요.', title: '저장 실패', tone: 'danger' });
      return false;
    }

    try {
      if (customerId) {
        const customerRef = doc(db, 'customers', customerId);
        const logAmpm = nowObj.getHours() >= 12 ? '오후' : '오전';
        const logHour = nowObj.getHours() % 12 || 12;
        const customTimelineTimestamp = `${nowObj.getFullYear()}년 ${mm}월 ${dd}일 ${logAmpm} ${logHour}시`;

        const originalRecord = history.find(r => r.id === currentViewingRecord?.id);
        
        const logMessage = generateTimelineLogMessage(
          isNewSession, 
          { chartData: finalChartData, intent, memos: finalMemos, customerInfo }, 
          originalRecord?.data
        );

        const newTimelineLog = {
          id: `log_${Date.now()}`,
          date: customTimelineTimestamp,
          chartId: recordId,
          ballName: finalRecordName, 
          layoutInfo: isNewSession ? (layoutInfo || '') : '', 
          actionType: isNewSession ? 'CREATE' : 'UPDATE',
          message: logMessage, 
        };

        const updatedLogs = [...(customer.activityLogs || []), newTimelineLog];
        if (updatedLogs.length > 15) updatedLogs.splice(0, updatedLogs.length - 15);

        // [1] 파이어베이스 마스터 고객 문서 업데이트 (단독모드 아닐 때만)
        if (dbMode !== 'supabase') {
          await updateDoc(customerRef, { 
            activityLogs: updatedLogs,
            ...customerInfo
          });
        }

        // [2-Dual] 듀얼 모드일 때 슈파베이스 고객 마스터 데이터 동시 싱크 및 통주머니 스냅샷 갱신
        if (dbMode === 'dual' || dbMode === 'supabase') {
          const isoNowString = nowObj.toISOString();
          
          // 💡 [오류 완치] customer 마스터의 가입일시 파이어베이스 Timestamp 토큰을 ISO 문자열로 안전 파싱 디톡스
          let finalCustomerCreatedAtIso = isoNowString;
          if (customer?.createdAt) {
            finalCustomerCreatedAtIso = typeof customer.createdAt.toDate === 'function'
              ? customer.createdAt.toDate().toISOString()
              : new Date(customer.createdAt).toISOString();
          }

          const shadowCustomerPayload = {
            ...customer,
            activityLogs: updatedLogs,
            ...customerInfo,
            createdAt: finalCustomerCreatedAtIso,
            updatedAt: isoNowString
          };

          // 💡 [오류 완치] PostgREST 패치 누락 방지를 위해 마스터 루트 컬럼들과 함께 명시적으로 동시 주입
          const { error: supabaseCustErr } = await supabase
            .from('customers')
            .update({
              name: customer.name || '미지정 고객',
              phone: customer.phone || '',
              club: customer.club || '',
              gender: customer.gender || '',
              hand: customer.hand || '',
              style: customer.style || '',
              styleExtra: customer.styleExtra || '',
              updatedAt: isoNowString,
              customer_data: shadowCustomerPayload // 타임라인 로그가 포함된 100% 원형 보존 주머니 갱신
            })
            .eq('id', customerId);

          if (supabaseCustErr) throw supabaseCustErr;
        }

        // [오류 완치 - 메모리 즉시 동기화]
        if (customer) {
          customer.activityLogs = updatedLogs;
          Object.assign(customer, customerInfo); 
        }
      }
    } catch (logError) {
      console.error('타임라인 로그 및 회원 프로필 업데이트 실패:', logError);
    }

    if (isNewSession && refreshChartCount) {
      try { await refreshChartCount(); } catch(e) { console.error('카운트 갱신 중 오류:', e); }
    }

    setSaveDate(nowTimestamp);
    setSessionRecordId(newRecord.id); 
    setSessionRecordName(finalRecordName); 

    if (currentViewingRecord !== null) {
      setViewingRecord({ id: newRecord.id, name: finalRecordName, timestamp: nowTimestamp });
    }

    if (isNewSession) {
      setChartData(finalChartData); 
      setMemos(finalMemos);
    }

    setHasUnsavedChanges(false);
    if (!silent) setFeedback({ message: `${customer.name} 고객님의 기록이 저장되었습니다.`, tone: 'success' });
    
    return true;

  }, [hasUnsavedChanges, maxChartsAllowed, currentChartsCount, userTier, history, ballName, chartData, customerInfo, layoutInfo, intent, memos, saveRecord, customer, refreshChartCount, setFeedback, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  const loadRecord = useCallback((record, asTemplate = false) => {
    const recordData = record.data || record;
    const profile = getCustomerChartProfile(customer);

    const loadedChartData = recordData.chartData || {};
    setChartData({
      ...loadedChartData,
      maintenanceLogs: asTemplate ? [] : (loadedChartData.maintenanceLogs || []), 
      thumbOffset: loadedChartData.thumbOffset || { left: '', right: '' },
      drillingGuide: loadedChartData.drillingGuide || { ovalCut: '', ovalCorrection: '0', isDetailedMode: false },
      handedness: loadedChartData.handedness ?? profile.handedness,
      isThumbless: loadedChartData.isThumbless ?? profile.isThumbless,
    });
    
    if (recordData.customerInfo) setCustomerInfo(recordData.customerInfo);
    
    if (asTemplate) {
      setBallName(''); setLayoutInfo(''); setIntent(''); setSaveDate('');
      setViewingRecord(null); setSessionRecordId(null); setSessionRecordName('');
    } else {
      setBallName(recordData.ballName || ''); setLayoutInfo(recordData.layoutInfo || ''); setIntent(recordData.intent || '');
      setSaveDate(record.timestamp || record.createdAt || '');
      setViewingRecord({ id: record.id, name: record.name || '불러온 기록', timestamp: record.timestamp || record.createdAt });
      setSessionRecordId(record.id); setSessionRecordName(record.name || '불러온 기록');
    }
    
    setIsEditMode(false); setHasUnsavedChanges(false); setHasWarnedModify(false);

    setMemos(asTemplate ? [] : (recordData.memos || []));
  }, [customer, setMemos, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  const convertToTemplate = useCallback(() => {
    setBallName('');
    setLayoutInfo('');
    setIntent('');
    
    setChartData(prev => ({
      ...prev,
      maintenanceLogs: [] 
    }));         
    
    setCustomerInfo({
      fingerStiff: customer?.fingerStiff || '',
      thumbStiff: customer?.thumbStiff || '',
      moisture: customer?.moisture || '',
      trackFlare: customer?.trackFlare || '',
      tilt: customer?.tilt || '',
      papX: customer?.papX || '',
      papY: customer?.papY || '',
      ballSpeed: customer?.ballSpeed || '',
      rpm: customer?.rpm || ''
    });

    setSaveDate('');
    setViewingRecord(null);
    setSessionRecordId(null);
    setSessionRecordName('');
    
    setHasUnsavedChanges(false);
    setHasWarnedModify(false);
  }, [customer, setSessionRecordId, setSessionRecordName, setViewingRecord]);

  const handleChartDataChange = useCallback((newData) => {
    setHasUnsavedChanges(true);
    setChartData(newData);
  }, []);

  const updateCustomerInfo = useCallback((updater) => {
    setCustomerInfo(prev => typeof updater === 'function' ? updater(prev) : updater);
    setHasUnsavedChanges(true);
  }, []);

  const updateWorkField = useCallback((setter) => (value) => {
    setter(value);
    setHasUnsavedChanges(true);
  }, []);

  return {
    isEditMode, setIsEditMode, chartData, setChartData, customerInfo, setCustomerInfo, ballName, setBallName, layoutInfo, setLayoutInfo, intent, setIntent, viewingRecord, setViewingRecord, sessionRecordId, setSessionRecordId, sessionRecordName, setSessionRecordName, hasUnsavedChanges, setHasUnsavedChanges, showModifyWarning, setShowModifyWarning, hasWarnedModify, setHasWarnedModify, handleChartDataChange, updateCustomerInfo, updateWorkField, handleSave, loadRecord, convertToTemplate
  };
}